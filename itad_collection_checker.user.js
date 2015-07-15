// ==UserScript==
// @name        ITAD Collection Checker
// @namespace   itad
// @include     http://www.gog.com/game/*
// @version     1.0
// @grant       GM_xmlhttpRequest
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// ==/UserScript==

/**
 * App info needed for communicating with ITAD API
 */
var app = {
    client_id: "b7439aebac7664bb",
    apikey: "cb30c798e2d7c89a123f1181755b1376533c3ffa",
    state: Date.now(),
    _token: false,

    /**
     * Get Authorization URL
     */
    authURL: function() {
        return "http://api.isthereanydeal.com/oauth/authorize/?response_type=token&client_id=" + this.client_id + "&scope=coll_read&redirect_uri="+window.location.href+"&state=" + this.state;
    },

    /**
     * Get OAuth access token
     * Checks URL hash for new access token and saves it on success,
     * otherwise tries to get token from storage.
     */
    token: function() {
        if (!this._token) {

            // check url
            if (window.location.hash) {
                var a = window.location.hash.substr(1).split("&");

                var token = false;
                for (var i=0; i< a.length; i++) {
                    var param = a[i].split("=");
                    var key = param[0];
                    var val = param[1];

                    if (key == "access_token") {
                        token = val;
                    } else if (key == "state" && token) {
                        if (GM_getValue("oauth_state") == val) {
                            this._token = token;
                            GM_setValue("token", this._token);
                        }
                        GM_deleteValue("oauth_state");
                    }
                }
            }

            // check cache
            this._token = GM_getValue("token", false);
        }
        return this._token;
    },

    /**
     * Delete OAuth access token from local storage
     */
    clearToken: function(){
        GM_deleteValue("token");
        this._token = false;
    }
};

/**
 * XPath helper function for checking HTML attributes content
 * Checks whether elements 'atr' attribute contains 'value'
 * http://stackoverflow.com/questions/8808921/selecting-a-css-class-with-xpath/9133579#9133579
 */
function xAtrib(atr, value) {
    return "contains(concat(' ', normalize-space(@"+atr+"), ' '), ' "+value+" ')";
}

var page = {

    /** For how long to cache Collection. */
    expiry: 24*60*60*1000,

    /** Current shop we are on. ID as used by ITAD. */
    shop: null,

    /** ITAD's game identifier */
    plain: null,

    /** User's Collection. Store timestamp of last Collection check and list of games returned by ITAD */
    collection: {
        timestamp: null,
        games: []
    },

    /** Current status of the API requests; true when request finished */
    status: {
        plain: false,
        collection: false
    },


    _container: null,

    _cacheKey: function() {
        return "collection:"+this.shop;
    },

    /**
     * Helper for updating actual page
     * Should add content to container
     */
    _addHTML: function(content) {
        switch(this.shop) {
            case "gog":
                this.container().innerHTML = content + this.container().innerHTML;
                break;
        }
    },

    /**
     * HTML container to which new elements will be added (links to authorize or info about ownership)
     */
    container: function() {
        if (!this._container) {
            switch(this.shop) {
                case "gog":
                    this._container = document.evaluate(
                        "//div["+xAtrib("class", "column--right")+"]/div["+xAtrib("class", "module-header")+"][1]",
                        document,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null
                    ).singleNodeValue;
            }
        }
        return this._container;
    },

    /**
     * Generate authorization request
     */
    requestAuthorization: function() {
        switch(this.shop) {
            case "gog":
                this._addHTML("<a href='" + app.authURL() + "' id='itad-authorize' style='float:right;text-decoration:underline'>Authorize on ITAD</a>");
                break;
        }

        document.getElementById("itad-authorize").addEventListener("click", function() {
            GM_setValue("oauth_state", app.state);
        });
    },

    /**
     * Issue API request to load Collection from ITAD and save it to local storage if successfull
     */
    _loadCollection: function() {
        var ref = this;

        GM_xmlhttpRequest({
            method: "GET",
            url: "http://api.isthereanydeal.com/v01/user/coll/all/?access_token=" + app.token() + "&optional=stores",
            onload: function(response) {
                var data = JSON.parse(response.responseText);
                if (!data.error) {
                    ref.collection.timestamp = Date.now();
                    ref.collection.games = data.data;
                    GM_setValue(ref._cacheKey(), JSON.stringify(ref.collection));

                    ref.status.collection = true;
                    ref._checkOwnership();
                } else if (data.error == "invalid_token") {
                    app.clearToken();
                    ref.requestAuthorization();
                }
            }
        });
    },

    /**
     * Get Collection from cache or load it from ITAD
     */
    getCollection: function() {
        var cached = GM_getValue(this._cacheKey(), false);
        if (!cached) {
            this._loadCollection();
        } else {
            var obj = JSON.parse(cached);
            if (obj.timestamp + this.expiry < Date.now()) {
                this._loadCollection();
            } else {
                this.collection = obj;

                this.status.collection = true;
                this._checkOwnership();
            }
        }
    },

    /**
     * Issue API request to get plain from ITAD
     * id, url, and title params are optional but at least one has to be used
     */
    _loadPlain: function(id, url, title) {
        var ref = this;
        var request = "";
        if (id) { request += "&game_id="+encodeURIComponent(id); }
        if (url) { request += "&url="+encodeURIComponent(url); }
        if (title) { request += "&title="+encodeURIComponent(title); }

        if (request == "") {return;}

        GM_xmlhttpRequest({
            method: "GET",
            url: "http://api.isthereanydeal.com/v02/game/plain/?key=" + app.apikey + "&shop=" + ref.shop + request,
            onload: function(response) {
                var data = JSON.parse(response.responseText);
                if (!data.error && data['.meta'].match !== false) {
                    ref.plain = data.data.plain;
                    ref.status.plain = true;
                    ref._checkOwnership();
                }
            }
        });
    },

    /**
     * Get info from store page and use it to identify the game and loading plain
     */
    getPlain: function() {
        switch(this.shop) {
            case "gog":
                var gamedata = unsafeWindow.gogData.gameProductData;
                this._loadPlain(gamedata.id, gamedata.url, gamedata.title);
                break;
        }
    },

    /**
     * Check whether given plain is in Collection from other than visited store
     */
    _checkOwnership: function() {
        if (!this.status.plain || !this.status.collection) {return;}

        if (this.plain in this.collection.games) {
            var all = this.collection.games[this.plain].stores;
            var stores = [];
            for (var i=0; i<all.length; i++) {
                if (all[i].id == this.shop) {continue;}
                stores.push(all[i].name);
            }

            if (stores.length != 0) {
                if (stores.length == 1) {
                    this._addHTML("<span style='float:right'>Owned on " + stores[0] + "</span>");
                } else {
                    this._addHTML("<span style='float:right'>Owned on " + stores.length + " other stores</span>");
                }
            }
        }
    }
};


/**
 * Set up shop identifier and either request authorization or get necessary data
 * page.getCollection() and page.getPlain() will automatically check ownership when they are finished
 */

page.shop = "gog";

if (!app.token()) {

    page.requestAuthorization();

} else {

    page.getCollection();
    page.getPlain();

}
