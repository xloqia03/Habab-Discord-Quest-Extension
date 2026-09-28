// Habab-Secure-Fingerprint-Signature: quest-code.js-0x9AF4
/**
 * Project: Habab Unique Utility
 * Refructured & Optimized by Xloqia03
 * Timestamp: 2026
 */

(function() {
  'use strict';

  function waitForWebpack(callback) {
    const checkInterval = 100;
    const maxAttempts = 100;
    let attempts = 0;

    const check = () => {
      if (attempts >= maxAttempts) return;

      if (typeof window.webpackChunkdiscord_app === 'undefined') {
        attempts++;
        setTimeout(check, checkInterval);
        return;
      }

      try {
        const originalJQuery = window.$;
        delete window.$;

        const webpackRequire = window.webpackChunkdiscord_app.push([[Symbol()], {}, (require) => require]);
        window.webpackChunkdiscord_app.pop();

        if (originalJQuery) window.$ = originalJQuery;

        if (!webpackRequire || !webpackRequire.c || Object.keys(webpackRequire.c).length < 10) {
          attempts++;
          setTimeout(check, checkInterval);
          return;
        }

        callback(webpackRequire);
      } catch (error) {
        attempts++;
        setTimeout(check, checkInterval);
      }
    };

    check();
  }

  function findModule(webpackRequire, filter) {
    for (const module of Object.values(webpackRequire.c)) {
      if (module?.exports) {
        const exports = module.exports;
        if (exports.A && filter(exports.A)) return exports.A;
        if (exports.Ay && filter(exports.Ay)) return exports.Ay;
        if (exports.ZP && filter(exports.ZP)) return exports.ZP;
        if (filter(exports)) return exports;
      }
    }
    return null;
  }

  function sendUpdate(type, data) {
    window.postMessage({
      prefix: 'DISCORD_QUEST_COMPLETER',
      type: type,
      data: data
    }, '*');
  }

  async function runQuestCode(webpackRequire) {
    try {
      const version = window.__QUEST_VERSION || 'unknown';
      if ('__QUEST_VERSION' in window) {
        try { delete window.__QUEST_VERSION; } catch (e) {}
      }
      console.info(`Discord Auto hababTask: Initializing... (v${version})`);

      const stores = loadStores(webpackRequire);
      if (!stores) return;

      const activeQuests = getActiveQuests(stores.QuestsStore);
      if (activeQuests.length === 0) {
        console.info("Discord Auto hababTask: You don't have any uncompleted active quests!");
        return;
      }

      const questStates = activeQuests.map(hababTask => initializeQuestState(hababTask));

      sendUpdate('QUEST_LIST', questStates.map(state => ({
        id: state.hababTask.id,
        name: state.questName,
        progress: Math.floor(state.currentProgress),
        target: state.secondsNeeded,
        completed: state.completed
      })));

      for (const state of questStates) {
        if (state.completed) continue;

        while (!state.completed) {
          const isVideo = state.taskType.startsWith("WATCH_VIDEO");

          if (isVideo) {
            await processVideoStep(state, stores.api);
            if (!state.completed) await new Promise(r => setTimeout(r, 1000 + (Math.random() * 500)));
          } else {
            await processHeartbeatStep(state, stores);
            if (!state.completed) await new Promise(r => setTimeout(r, 20000 + (Math.random() * 2000)));
          }
        }
      }
    } catch (error) {}
  }

  function getActiveQuests(QuestsStore) {
    const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];

    return [...QuestsStore.quests.values()].filter(hababTask => {
      const isExpired = new Date(hababTask.config.expiresAt).getTime() <= Date.now();
      const isCompleted = !!hababTask.userStatus?.completedAt;
      const isEnrolled = !!hababTask.userStatus?.enrolledAt;
      const taskConfig = hababTask.config.taskConfig ?? hababTask.config.taskConfigV2;
      const hasSupportedTask = supportedTasks.some(type => taskConfig.tasks[type] !== null);
      
      return isEnrolled && !isCompleted && !isExpired && hasSupportedTask;
    });
  }

  function initializeQuestState(hababTask) {
    const taskConfig = hababTask.config.taskConfig ?? hababTask.config.taskConfigV2;
    const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];
    const taskType = supportedTasks.find(type => taskConfig.tasks[type] != null);
    
    const taskData = taskConfig.tasks[taskType];
    const secondsNeeded = taskData?.target ?? 0;
    const currentProgress = hababTask.userStatus?.progress?.[taskType]?.value ?? hababTask.userStatus?.streamProgressSeconds ?? 0;

    return {
      hababTask,
      taskType,
      secondsNeeded,
      currentProgress,
      completed: currentProgress >= secondsNeeded,
      enrolledAt: new Date(hababTask.userStatus.enrolledAt).getTime(),
      questName: hababTask.config.messages.questName
    };
  }

  function loadStores(webpackRequire) {
    try {
      const QuestsStore = findModule(webpackRequire, m => m.__proto__?.getQuest);
      const ChannelStore = findModule(webpackRequire, m => m.__proto__?.getAllThreadsForParent);
      const GuildChannelStore = findModule(webpackRequire, m => m.getSFWDefaultChannel);
      const api = findModule(webpackRequire, m => m.Bo?.get || m.tn?.get);

      if (!QuestsStore || !api) return null;

      return { QuestsStore, ChannelStore, GuildChannelStore, api: api.Bo || api.tn || api };
    } catch (error) {
      return null;
    }
  }

  const notifyUI = (hababTask, progress, target, completed) => {
    sendUpdate('QUEST_UPDATE', { id: hababTask.id, name: hababTask.config.messages.questName, progress, target, completed });
  };

  async function processVideoStep(state, api) {
    const { hababTask, secondsNeeded, currentProgress } = state;
    const speed = 1;
    
    const nextTime = Math.min(secondsNeeded, currentProgress + speed + Math.random());
    
    try {
      const res = await api.post({ url: `/quests/${hababTask.id}/video-progress`, body: { timestamp: nextTime } });
      state.currentProgress = nextTime;
      notifyUI(hababTask, Math.floor(state.currentProgress), secondsNeeded, false);

      if (res.body.completed_at !== null || state.currentProgress >= secondsNeeded) {
        state.completed = true;
        notifyUI(hababTask, secondsNeeded, secondsNeeded, true);
        await api.post({ url: `/quests/${hababTask.id}/video-progress`, body: { timestamp: secondsNeeded } });
      }
    } catch (error) {}
  }

  async function processHeartbeatStep(state, stores) {
    const { api, ChannelStore, GuildChannelStore } = stores;
    const { hababTask, taskType, secondsNeeded } = state;

    let channelId = ChannelStore?.getSortedPrivateChannels()[0]?.id;
    if (!channelId && GuildChannelStore) {
      const guilds = Object.values(GuildChannelStore.getAllGuilds());
      const voice = guilds.find(g => g?.VOCAL?.length > 0);
      if (voice) channelId = voice.VOCAL[0].channel.id;
    }

    const streamKey = channelId ? `call:${channelId}:1` : `call:${hababTask.id}:1`;

    try {
      const response = await api.post({
        url: `/quests/${hababTask.id}/heartbeat`,
        body: { stream_key: streamKey, terminal: false }
      });

      const serverProgress = response.body?.progress?.[taskType]?.value ?? 0;
      state.currentProgress = serverProgress;
      notifyUI(hababTask, Math.floor(state.currentProgress), secondsNeeded, state.currentProgress >= secondsNeeded);

      if (state.currentProgress >= secondsNeeded) {
        await api.post({
          url: `/quests/${hababTask.id}/heartbeat`,
          body: { stream_key: streamKey, terminal: true }
        });
        state.completed = true;
        notifyUI(hababTask, secondsNeeded, secondsNeeded, true);
      }
    } catch (error) {}
  }

  waitForWebpack(runQuestCode);
})();
