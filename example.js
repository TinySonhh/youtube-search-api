const ytSearchApi = require("./index.js")
//const ytSearchApi = require("@hssoftvn/yt-search-api")

ytSearchApi.SearchVideosByKeyword("Hello").then((result) => {result.items && console.log(result.items[0], result.nextPage);});

//ytSearchApi.FetchTrending("0").then((result) => {result.items && console.log(result.items[0], result.nextPage);});

//ytSearchApi.FetchWhatToWatchByYouTube().then((result) => {console.log(result)});

//ytSearchApi.GetVideoDetailsWithSuggestion("oQl9XjVKdQ4",'vi','vn').then((result) => {console.log(result)});