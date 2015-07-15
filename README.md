## ITAD Collection Checker

This Greasemonkey script checks your [IsThereAnyDeal.com Collection](http://isthereanydeal.com/collection/)
and let's you know if you already own the game (and where) while browsing stores.

*Currently intended to be an example to show how the ITAD API could be used. You are encouraged to fork it and build upon it.*

As of now Collection Checker works only on GOG.

### Installation

1. This script has been tested in Firefox with [Greasemonkey](https://addons.mozilla.org/en-us/firefox/addon/greasemonkey/).
You will have to download the extension if you haven't already got it
 
2. Download itad_collection_checker.user.js from this repository

3. Drag'n'drop the downloader file into Firefox. You should see Greasemonkey window telling you some info about the script

4. Confirm script installation

5. Now you should be good to go

### How to use

To verify the installation was successfull, head over to [GOG](http://gog.com) and open some game page,
e.g. [Guild of Dungeoneering](http://www.gog.com/game/guild_of_dungeoneering). You should see *Authorize on ITAD*
link right above *Add to cart* button (see screenshots below). If you see it, the script was successfully installed.

Before the script will start telling you if you already own the game or not, you will have to authorize it on ITAD.
Click on the authorize link and confirm authorization.

> Sidenote: **Is it safe?**

> Yes, when you are authorizing the app, you will give it some rights to your account, which are listed on the authorize page.
In this case, the script will be able to only read your Collection. It won't see any of your credentials or any other data.
 
> However, take into consideration that this is an example app. You should probably not use this on a public or shared computer,
since the token the app acquires as well as Collection is cached, and while no one can get access to your account on ITAD,
they may still see what games you own even if you log out.

Now, if everything worked right, you should no longer see the *Authorize on ITAD* link and you should start seeing
something like *Owned at Steam* instead if you own the game.


### Screenshots

![GOG Authorize example](https://raw.githubusercontent.com/tfedor/itad_collection_checker/master/screenshots/authorize.png)

![GOG owned example](https://raw.githubusercontent.com/tfedor/itad_collection_checker/master/screenshots/owned.png)

### Development

**DISCLAIMER: this was my first Greasemonkey script and I'm not used to work with plain Javascript.
In no way, shape or form should this code be considered optimal.**

The obvious next step for the script is the extension to multiple stores. I tried to write it in a way that it should be fairly easy task.

You will need to update following:

1. @include of the script
2. page.container() - find where you want the info to show up and get the HTML element
3. page._addHTML() - how the new content will be added to the container
4. page.requestAuthorization() - should be fairly similar to GOG, but you may want to use different style or class
5. page.getPlain() - load info about the game from the store page and use it to load plain

You will also have to use your own client_id and apikey in app object because you will need to
set up update redirect URIs on ITAD. Consult [our API documentation](http://docs.itad.apiary.io) for further explanation of our OAuth implementation
and API endpoints.

Another improvement might, for example, be better handling of user state and allowing to clear cached data.
