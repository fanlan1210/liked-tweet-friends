const vm = Vue.createApp({
  data() {
    return {
      isResulted: false,
      me: 'Myself',
      topFriends: [],
      showSettings: false,
      settings: {
        displayInteractionCount: false,
        displayRankOrderNumber: true
      }
    }
  },
  methods: {
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          this.parseTweets(e.target.result);
        } catch (err) {
          console.error(err);
          Swal.fire('錯誤', '檔案解析失敗，請確認上傳的是正確的 tweets.js 檔案', 'error');
        }
      };
      reader.readAsText(file);
    },

    parseTweets(content) {
      // Locate the start of the JSON array
      const startIndex = content.indexOf('[');
      if (startIndex === -1) {
        throw new Error('Invalid tweets.js file: JSON array not found.');
      }
      const jsonContent = content.substring(startIndex);
      const tweets = JSON.parse(jsonContent);

      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const interactionCounts = {};

      tweets.forEach(item => {
        const tweet = item.tweet;
        const tweetDate = new Date(tweet.created_at);

        // Date Filter
        if (tweetDate < threeMonthsAgo) return;

        // Analyze User Mentions
        if (tweet.entities && tweet.entities.user_mentions) {
          tweet.entities.user_mentions.forEach(mention => {
            this.updateInteraction(interactionCounts, mention.id_str, mention.name, mention.screen_name);
          });
        }

        // Analyze Replies (if not already counted in mentions, usually they are)
        // Note: in_reply_to_user_id is usually present, but we might not have the name/screen_name if not in mentions.
        // However, Twitter usually includes the replied-to user in user_mentions.
        // So relying on user_mentions is safer for getting names.
        // We can double check if we want to count strict replies specifically, but user_mentions covers both.
      });

      // Convert counts to array and sort
      const sortedInteractions = Object.values(interactionCounts).sort((a, b) => b.count - a.count);

      // Get top 3
      const top3 = sortedInteractions.slice(0, 3);

      if (top3.length > 0) {
        this.topFriends = top3.map(user => ({
          username: user.name,
          screen_name: user.screen_name,
          count: user.count,
          img: '#'
        }));
        this.isResulted = true;
      } else {
        Swal.fire('提示', '最近三個月內沒有找到互動記錄', 'info');
      }
    },

    updateInteraction(counts, id, name, screen_name) {
      // Filter out self (optional, if we know self ID, but we don't easily. 
      // Often people don't mention themselves, but they might reply to themselves.)
      // For now, let's include all.
      if (!counts[id]) {
        counts[id] = { count: 0, name, screen_name };
      }
      counts[id].count++;
    }
  }
});

vm.mount('#app');
