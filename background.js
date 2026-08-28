chrome.runtime.onInstalled.addListener(() => {
  console.info('Habab Auto Quest extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // =========================================================
  // GET EXTENSION VERSION
  // =========================================================

  if (request.action === 'getVersion') {

    const manifest = chrome.runtime.getManifest();

    sendResponse({
      version: manifest.version
    });

    return false;
  }


  // =========================================================
  // VERIFY HABAB SERVER MEMBERSHIP
  // =========================================================

  else if (request.action === 'verifyHababMembership') {

    if (!sender.tab || !sender.tab.id) {

      sendResponse({
        success: false,
        isMember: false,
        error: 'No active Discord tab'
      });

      return false;
    }


    const HABAB_GUILD_ID = '746092533150515250';


    chrome.scripting.executeScript({

      target: {
        tabId: sender.tab.id
      },

      world: 'MAIN',

      func: (guildId) => {

        try {

          // Discord Webpack
          if (
            typeof window.webpackChunkdiscord_app === 'undefined'
          ) {

            return {
              success: false,
              isMember: false,
              error: 'Discord Webpack is not ready'
            };

          }


          // Get Discord's webpack require
          const webpackRequire =
            window.webpackChunkdiscord_app.push([
              [Symbol()],
              {},
              (require) => require
            ]);

          window.webpackChunkdiscord_app.pop();


          if (
            !webpackRequire ||
            !webpackRequire.c
          ) {

            return {
              success: false,
              isMember: false,
              error: 'Webpack modules unavailable'
            };

          }


          let guildStore = null;


          // Search Discord modules for GuildStore
          for (
            const module of Object.values(
              webpackRequire.c
            )
          ) {

            if (
              !module ||
              !module.exports
            ) {
              continue;
            }


            const exports =
              module.exports;


            const candidates = [
              exports,
              exports.A,
              exports.Ay,
              exports.ZP,
              exports.default
            ];


            for (
              const candidate of candidates
            ) {

              if (
                candidate &&
                typeof candidate.getGuild === 'function'
              ) {

                guildStore = candidate;

                break;
              }

            }


            if (guildStore) {
              break;
            }

          }


          if (!guildStore) {

            return {
              success: false,
              isMember: false,
              error: 'GuildStore not found'
            };

          }


          // Check if the current Discord account
          // has this guild in its GuildStore
          const guild =
            guildStore.getGuild(guildId);


          return {
            success: true,
            isMember: !!guild
          };


        } catch (error) {

          return {
            success: false,
            isMember: false,
            error:
              error?.message ||
              'Unknown verification error'
          };

        }

      },

      args: [
        HABAB_GUILD_ID
      ]

    }).then((results) => {

      const result =
        results?.[0]?.result;


      if (!result) {

        sendResponse({
          success: false,
          isMember: false,
          error: 'No verification result'
        });

        return;
      }


      console.info(
        '[Habab Auto Quest] Membership verification:',
        result
      );


      sendResponse(result);


    }).catch((error) => {

      console.error(
        '[Habab Auto Quest] Membership verification failed:',
        error
      );


      sendResponse({
        success: false,
        isMember: false,
        error:
          error?.message ||
          'Verification failed'
      });

    });


    // Keep message channel open
    return true;
  }


  // =========================================================
  // EXECUTE QUEST CODE
  // =========================================================

  else if (request.action === 'executeQuestCode') {

    if (
      sender.tab &&
      sender.tab.id
    ) {

      const manifest =
        chrome.runtime.getManifest();


      // Set quest version
      chrome.scripting.executeScript({

        target: {
          tabId: sender.tab.id
        },

        func: (version) => {

          window.__QUEST_VERSION =
            version;

        },

        args: [
          manifest.version
        ],

        world: 'MAIN'

      }).then(() => {

        // Inject quest-code.js
        return chrome.scripting.executeScript({

          target: {
            tabId: sender.tab.id
          },

          files: [
            'quest-code.js'
          ],

          world: 'MAIN'

        });

      }).then(() => {

        sendResponse({
          success: true
        });


      }).catch((error) => {

        console.error(
          'Error injecting quest code:',
          error
        );


        sendResponse({
          success: false,
          error: error.message
        });

      });


      return true;


    } else {

      sendResponse({
        success: false,
        error: 'No tab ID found'
      });


      return false;
    }
  }

});