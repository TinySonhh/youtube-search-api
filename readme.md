# Youtube Search API

Youtube Search API is an API for getting Youtube search results.

## Installation

```bash
npm install @hssoftvn/yt-search-api
```

## Usage (import)

```node
const ytSearchApi = require("@hssoftvn/yt-search-api");
```

## 1. SearchVideosByKeyword (Promise)
Search YouTube videos by the keyword
```javascript
const SearchVideosByKeyword: (keyword: any, lang?: any, country?: any, withPlaylist?: any, limit?: any, options?: any) => Promise<{
    items: any[];
    nextPage: {
        nextPageToken: null;
        nextPageContext: {
            context: null;
            continuation: {};
        };
    };
}>
```

### Parameters

| Parameter     | Type       | Value                                                  |
| ------------  | ---------- | ------------------------------------------------------ |
| keyword       | String     | up to you                               |
| lang          | boolean    | user language code that video applies for, default vi  |
| country       | boolean    | country code that video applies for, default vn        |
| withPlaylist  | boolean    | whether the search results consist of playlist     |
| limit         | number     | limit the number of result items found                 |
| options       | JSON Array | [{type:"video/channel/playlist/movie"}]                |

### Result

- JSON of items found, and nextPage token
- `items` is the array from youtube, "nextPage" needs to pass when going to the next page. If playlist arg is true, will return `type:'playlist'` but the `videos:[]` property will not return the whole videos in the list, need to call `GetPlaylistData` to get real playlist's videos. Item with Video type will return `isLive=[true/false]` to identify live video or not.
- `item` is a `VideoRender` structure

```javascript
const VideoRender: (json: any) => {
    vid: any;
    type: string;
    thumbnail: string;
    title: any;
    channelTitle: any;
    channelId: any;
    channelThumbnail: any;
    duration: any;
    viewCount: any;
    publishedAt: any;
    isLive: boolean;
} | {
}
```

### Example

```javascript
ytSearchApi.SearchVideosByKeyword("Hello").then((result) => {
	console.log(result.items[0], result.nextPage);
});
```

## 2. FetchWhatToWatchByYouTube (Promise)
FetchWhatToWatchByYouTube

```javascript
const FetchWhatToWatchByYouTube: (lang?: string, country?: string, pageToken?: string) => Promise<{
    items: any[];
    nextPage: {
        nextPageToken: null;
        nextPageContext: {
            context: null;
            continuation: {};
        };
    };
}>
```

### Parameters

| Parameter     | Type        | Value                                                   |
| ------------  | ----------  | ------------------------------------------------------  |
| lang          | String      | up to you                                               |
| country       | String      | up to you                                               |
| pageToken     | String      | token of the page to search for                         |


### Result
- JSON of items found, and nextPage token
- Same as SearchVideosByKeyword

### Example

```javascript
ytSearchApi.FetchWhatToWatchByYouTube().then((result) => {
	console.log(result);
});
```


## 3. FetchTrending (Promise)
Fetch Trending

```javascript
const FetchTrending: (tab?: any, lang?: any, country?: any, limit?: any) => Promise<{
    items: any[];
    nextPage: {
        nextPageToken: null;
        nextPageContext: {
            context: null;
            continuation: {};
        };
    };
}>
```

### Parameters

| Parameter     | Type        | Value                                                   |
| ------------  | ----------  | ------------------------------------------------------  |
| tab           | Number      | 0=now, 1=music, 2=gaming, 3=movies                      |
| lang          | String      | up to you                                               |
| country       | String      | up to you                                               |
| limit         | String      | limit the result items                         |


### Result
- JSON of items found, and nextPage token
- Same as SearchVideosByKeyword

### Example

```javascript
ytSearchApi.FetchTrending("0").then((result) => {
	console.log(result.items && result.items[0], result.nextPage);
});
```


## 4. GetVideoDetailsWithSuggestion (Promise)
Get details of current videos along with its video suggestions

```javascript
const GetVideoDetailsWithSuggestion: (videoId: any, lang?: any, country?: any) => Promise<{
    title: any;
    isLive: any;
    thumbnail: string;
    description: any;
    channel: any;
    channelThumbnail: any;
    duration: string;
    viewCount: any;
    publishedAt: any;
    publishedAt2: any;
    suggestion: any;
}>
```

### Parameters

| Parameter     | Type        | Value                                                   |
| ------------  | ----------  | ------------------------------------------------------  |
| videoId           | Number      | 0=now, 1=music, 2=gaming, 3=movies                      |
| lang          | String      | up to you                                               |
| country       | String      | up to you                                               |


### Result
- JSON object of video details and its videos suggestion array
```javascript
{
    title: any;
    isLive: any;
    thumbnail: string;
    description: any;
    channel: any;
    channelThumbnail: any;
    duration: string;
    viewCount: any;
    publishedAt: any;
    publishedAt2: any;
    suggestion: any;
}
```

### Example

```javascript
ytSearchApi.GetVideoDetailsWithSuggestion("oQl9XjVKdQ4").then((result) => {
	console.log(result);
});
```


## Notice:
1. We just focus on the 4 functions above.
2. Other functions we are note sure if they work.


## Message

If you want to work with me to fix bug or implement new idea. You are available to send me some new idea of this project.

Indeed, I will also need to clean up this later.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## Todo
1. Tidy up source


## History

### 2024-08-01
Initial publish the module.

We just focus on the 4 functions below.
Other functions we are note sure if they work.

1. SearchVideosByKeyword
2. FetchWhatToWatchByYouTube
3. FetchTrending
4. GetVideoDetailsWithSuggestion

## License

[MIT](https://choosealicense.com/licenses/mit/)

## Support me

https://ko-fi.com/hssoftvn