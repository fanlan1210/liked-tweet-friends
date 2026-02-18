const vm = Vue.createApp({
  data() {
    return {
      isResulted: false,
      me: 'Myself',
      liked: {
        username: 'unknown',
        screen_name: 'null',
        count: 0,
        img: '#'
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

      // Find top interaction
      let topUser = null;
      let maxCount = -1;

      for (const [id, data] of Object.entries(interactionCounts)) {
        if (data.count > maxCount) {
          maxCount = data.count;
          topUser = data;
        }
      }

      if (topUser) {
        this.liked = {
          username: topUser.name,
          screen_name: topUser.screen_name,
          count: topUser.count,
          img: '#' // Images are not available in tweets.js typically
        };
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
