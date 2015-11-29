'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const wrap = require('co-express');
const Article = mongoose.model('Article');

const blackList = ["the", "is", "are", "am", "a", "of", "to", "it", "and", "at"];

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


exports.loadTags = wrap(function* (req, res, next) {
  var articleTags = yield Article.getTags(); 
  req.tags = [];

  // Going over all the tags by articles and building a distinct array
  for (var i=0; i < articleTags.length; i++) {
    var curArticleTags = articleTags[i].tags.split(",");
    for (var j=0; j < curArticleTags.length; j++) {
      var curTag = curArticleTags[j];
      if (indexOfByProp(req.tags, "tag", curTag) === -1) {
        req.tags.push({tag: curTag});
      }
    }
  }
  next();
});


exports.loadTagsArticles = wrap(function* (req, res, next) {
    // Loading each tag's articles
  for (var i = 0; i < req.tags.length; i++) {
    req.tags[i].articles = yield Article.loadByTag(req.tags[i].tag);        
  }
  next();
});


exports.analytics = function (req, res) {
  var analytics = [];
  // For each tag
  for (var k = 0; k < req.tags.length; k++) {
    analytics[k] = {tag: req.tags[k].tag, words : []};
    // For each article
    for (var i = 0; i< req.tags[k].articles.length; i++) {
      var wordsInArticle = req.tags[k].articles[i].body.split(/\W+/);
      // For each word
      for (var j = 0; j < wordsInArticle.length; j++) {
        var word = wordsInArticle[j].toLowerCase();
        // Check if the word is blacklisted
        if (blackList.indexOf(word) === -1) {
          var l = indexOfByProp(analytics[k].words, "word", word);
          if (l !== -1) {
            analytics[k].words[l].count++;
          }
          else { 
            analytics[k].words.push({word: word, count : 1});
          }
        }
      }
    }
    // Sort the words arrays by count
    analytics[k].words.sort(function(a, b) {
      return parseFloat(b.count) - parseFloat(a.count);
    });
    // Keep only the top 10
    analytics[k].words = analytics[k].words.slice(0,10);
  }
    
  res.render('analytics', {analytics: analytics});
};



function indexOfByProp(arr, prop, val) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i][prop] === val)
      return i;
  }
  return -1;
}

