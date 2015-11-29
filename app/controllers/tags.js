'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const wrap = require('co-express');
const Article = mongoose.model('Article');

const blackList = ["the", "is", "are", "am", "a", "of", "to", "it", "and", "at", ""];

/**
 * List items tagged with a tag
 */

exports.index = wrap(function* (req, res) {
  const criteria = { tags: req.params.tag };
  const page = (req.params.page > 0 ? req.params.page : 1) - 1;
  const limit = 30;
  const options = {
    limit: limit,
    page: page,
    criteria: criteria
  };

  const articles = yield Article.list(options);
  const count = yield Article.count(criteria);

  res.render('articles/index', {
    title: 'Articles tagged ' + req.params.tag,
    articles: articles,
    page: page + 1,
    pages: Math.ceil(count / limit)
  });
});

exports.loadArticles = wrap(function* (req, res, next) {
  req.articles = yield Article.listSimple(); 
  next();
});

exports.buildAnalytics = function(req, res) {
  var analytics = [];
  // For each article
  for (var i = 0; i < req.articles.length; i++) {
    // var wordsInArticle = req.articles[i].body.split(/\W+/);
    var wordsInArticle = req.articles[i].body.split(/[\s,!?.]+/);
    // For each word in the article
    for (var j = 0; j < wordsInArticle.length; j++) {
      var word = wordsInArticle[j].toLowerCase();
      // Check if the word isn't blacklisted
      if (blackList.indexOf(word) === -1) {
        var curArticleTags = req.articles[i].tags.split(","); 
        // Go over each of the article's tags and insert\update it's count
        for (var k = 0; k < curArticleTags.length; k++) {
          var curTag = curArticleTags[k];
          var l = indexOfByProp(analytics, "tag", curTag);
          // If it's the first time this tag appears
          if (l === -1) {
            analytics.push({tag: curTag, words : [{word: word, count : 1}]});
          }
          else {
            var m = indexOfByProp(analytics[l].words, "word", word);
            // If it's the first time this word appears in an article with this tag
            if (m === -1) {
              analytics[l].words.push({word: word, count : 1})
            }
            else {
              analytics[l].words[m].count++;
            }
          }
        }
      }
    }
  }

  // Sort the words by count and keep only the top 10
  for (var i = 0; i< analytics.length; i++){
    analytics[i].words.sort(function(a, b) {
      return parseFloat(b.count) - parseFloat(a.count);
    });
    analytics[i].words = analytics[i].words.slice(0,10);
  }

  res.render('analytics', {analytics: analytics});
};


function indexOfByProp(arr, prop, val) {
  if (arr.length) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i][prop] === val)
        return i;
    }
  }
  return -1;
}

