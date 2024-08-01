const axios = require("axios");
const { async } = require("crypto-random-string");
const youtubeEndpoint = `https://www.youtube.com`;

/**
 * GetYoutubeInitData for internal use only to fetch some youjtube internal data to get Youtube API key
 * @param {String} url URL of the youtube link to search for videos
 * @returns Promise of { initdata, apiToken, context }
 */
const GetYoutubeInitData = async (url) => {
  var initdata = await {};
  var apiToken = await null;
  var context = await null;
  try {
    //console.log(encodeURI(url));
    const page = await axios.get(encodeURI(url));
    const ytInitData = await page.data.split("var ytInitialData =");
    if (ytInitData && ytInitData.length > 1) {
      const data = await ytInitData[1].split("</script>")[0].slice(0, -1);
      if (page.data.split("innertubeApiKey").length > 0) {
        apiToken = await page.data
          .split("innertubeApiKey")[1]
          .trim()
          .split(",")[0]
          .split('"')[2];
      }

      if (page.data.split("INNERTUBE_CONTEXT").length > 0) {
        context = await JSON.parse(
          page.data.split("INNERTUBE_CONTEXT")[1].trim().slice(2, -2)
        );
      }

      initdata = await JSON.parse(data);
      return await Promise.resolve({ initdata, apiToken, context });
    } else {
      console.error("cannot_get_init_data");
      return await Promise.reject("cannot_get_init_data");
    }
  } catch (ex) {
    await console.error(ex);
    return await Promise.reject(ex);
  }
};

/**
 * Search YouTube videos by the keyword
 * @param {*} keyword keyword to search for
 * @param {*} lang user language code that video applies for, default vi
 * @param {*} country country code that video applies for, default vn
 * @param {*} withPlaylist whether the search results consist of playlist
 * @param {*} limit limit the number of result items found
 * @param {*} options extra option for the api
 * @returns JSON of items found, and nextPage token
 */
const SearchVideosByKeyword = async (
  keyword,
  lang = "vi",
  country = "VN",
  withPlaylist = false,
  limit = 0,
  options = []
) => {
  let endpoint = await `${youtubeEndpoint}/results?search_query=${keyword}`;
  try {
    if (Array.isArray(options) && options.length > 0) {
      const type = options.find((z) => z.type);
      if (typeof type == "object") {
        if (typeof type.type == "string") {
          switch (type.type.toLowerCase()) {
            case "video":
              endpoint = `${endpoint}&sp=EgIQAQ%3D%3D`;
              break;
            case "channel":
              endpoint = `${endpoint}&sp=EgIQAg%3D%3D`;
              break;
            case "playlist":
              endpoint = `${endpoint}&sp=EgIQAw%3D%3D`;
              break;
            case "movie":
              endpoint = `${endpoint}&sp=EgIQBA%3D%3D`;
              break;
          }
        }
      }
    }
    country = country.toUpperCase();
    endpoint = `${endpoint}&hl=${lang}&gl=${country}`;
    //console.log(endpoint);
    const page = await GetYoutubeInitData(endpoint);

    const sectionListRenderer = await page.initdata.contents
      .twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer;

    let contToken = await {};

    let items = await [];

    await sectionListRenderer.contents.forEach((content) => {
      if (content.continuationItemRenderer) {
        contToken =
          content.continuationItemRenderer.continuationEndpoint
            .continuationCommand.token;
      } else if (content.itemSectionRenderer) {
        content.itemSectionRenderer.contents.forEach((item) => {
          if (item.channelRenderer) {
            let channelRenderer = item.channelRenderer;
            items.push({
              id: channelRenderer.channelId,
              type: "channel",
              thumbnail: channelRenderer.thumbnail,
              title: channelRenderer.title.simpleText,
            });
          } else {
            let videoRender = item.videoRenderer;
            let playListRender = item.playlistRenderer;

            if (videoRender && videoRender.videoId) {
              items.push(VideoRender(item));
            }
            if (withPlaylist) {
              if (playListRender && playListRender.playlistId) {
                items.push({
                  id: playListRender.playlistId,
                  type: "playlist",
                  thumbnail: playListRender.thumbnails,
                  title: playListRender.title.simpleText,
                  length: playListRender.videoCount,
                  videos: playListRender.videos,
                  videoCount: playListRender.videoCount,
                  isLive: false,
                });
              }
            }
          }
        });
      }
    });
    const apiToken = await page.apiToken;
    const context = await page.context;
    const nextPageContext = await {
      context: context,
      continuation: contToken,
    };
    const itemsResult = limit != 0 ? items.slice(0, limit) : items;
    return await Promise.resolve({
      items: itemsResult,
      nextPage: {
        nextPageToken: apiToken,
        nextPageContext: nextPageContext,
      },
    });
  } catch (ex) {
    await console.error(ex);
    return await Promise.reject(ex);
  }
};

/**
 * Handle going to next page, by one the nextPage token
 * @param {*} nextPage token of next page, which is returned in the search result
 * @param {*} lang language of the videos to search for
 * @param {*} country country of the videos to search for
 * @param {*} withPlaylist whether the search results consist of playlist
 * @param {*} limit limit the number of found items
 * @returns JSON of items found, and nextPage token
 */
const nextPage = async (
  nextPage,
  lang = "vi",
  country = "VN",
  withPlaylist = false,
  limit = 0
) => {
  country = country.toUpperCase();
  const endpoint =
    await `${youtubeEndpoint}/youtubei/v1/search?key=${nextPage.nextPageToken}&hl=${lang}&gl=${country}`;
  try {
    const page = await axios.post(
      encodeURI(endpoint),
      nextPage.nextPageContext
    );
    const item1 =
      page.data.onResponseReceivedCommands[0].appendContinuationItemsAction;
    let items = [];
    item1.continuationItems.forEach((conitem) => {
      if (conitem.itemSectionRenderer) {
        conitem.itemSectionRenderer.contents.forEach((item, index) => {
          let videoRender = item.videoRenderer;
          let playListRender = item.playlistRenderer;
          if (videoRender && videoRender.videoId) {
            items.push(VideoRender(item));
          }
          if (withPlaylist) {
            if (playListRender && playListRender.playlistId) {
              items.push({
                id: playListRender.playlistId,
                type: "playlist",
                thumbnail: playListRender.thumbnails,
                title: playListRender.title.simpleText,
                length: playListRender.videoCount,
                videos: GetPlaylistData(playListRender.playlistId),
              });
            }
          }
        });
      } else if (conitem.continuationItemRenderer) {
        nextPage.nextPageContext.continuation =
          conitem.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
      }
    });
    const itemsResult = limit != 0 ? items.slice(0, limit) : items;
    return await Promise.resolve({ items: itemsResult, nextPage: nextPage });
  } catch (ex) {
    await console.error(ex);
    return await Promise.reject(ex);
  }
};

/**
 * Get details of current videos along with its video suggestions
 * @param {*} videoId videoId of the video
 * @param {*} lang language of the video to search for, default vi
 * @param {*} country country of the video to search for, default vn
 * @returns JSON object with video details and its videos suggestion array
 */
const GetVideoDetailsWithSuggestion = async (
  videoId,
  lang = "vi",
  country = "VN"
) => {
  country = country.toUpperCase();
  let endpoint =
    await `${youtubeEndpoint}/watch?v=${videoId}&hl=${lang}&gl=${country}`;
  endpoint = `${endpoint}&hl=en&gl=en`;
  try {
    const page = await GetYoutubeInitData(endpoint);
    const result = await page.initdata.contents.twoColumnWatchNextResults;
    const firstContent = await result.results.results.contents[0]
      .videoPrimaryInfoRenderer;
    const secondContent = await result.results.results.contents[1]
      .videoSecondaryInfoRenderer;
    const res = await {
      title: firstContent.title.runs[0].text,
      isLive: firstContent.viewCount.videoViewCountRenderer.hasOwnProperty(
        "isLive"
      )
        ? firstContent.viewCount.videoViewCountRenderer.isLive
        : false,
      thumbnail: "",
      description:
        secondContent.description != null
          ? secondContent.description.runs
          : []
              .map((x) => x.text)
              .join()
              .toString(),
      channel: secondContent.owner.videoOwnerRenderer.title.runs[0].text,
      channelThumbnail:
        secondContent.owner.videoOwnerRenderer.thumbnail.thumbnails[0].url,
      duration: "",
      viewCount:
        firstContent.viewCount.videoViewCountRenderer.viewCount.simpleText.replace(
          /[^0-9.]+/g,
          ""
        ),
      publishedAt: firstContent.dateText.simpleText,
      publishedAt2: firstContent.relativeDateText.simpleText,
      suggestion: result.secondaryResults.secondaryResults.results
        .filter((y) => y.hasOwnProperty("compactVideoRenderer"))
        .map((x) => compactVideoRenderer(x)),
    };

    return await Promise.resolve(res);
  } catch (ex) {
    return await Promise.reject(ex);
  }
};

const FetchWhatToWatchByYouTube = async (lang = "vi", country = "VN", pageToken="") => {
  let endpoint = await `${youtubeEndpoint}`;
  try {
    country = country.toUpperCase();
    endpoint = `${endpoint}?hl=${lang}&gl=${country}`;
    const page = await GetYoutubeInitData(endpoint);

    const mainContents = await page.initdata.contents
      .twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content
      .richGridRenderer.contents;

    let contToken = await {};

    let items = await [];

    await mainContents.forEach((richItem) => {
      if (richItem.continuationItemRenderer) {
        contToken =
          richItem.continuationItemRenderer.continuationEndpoint
            .continuationCommand.token;
      }
      else if (richItem.richItemRenderer) {
        let videoRender = richItem.richItemRenderer.content.videoRenderer;
        if (videoRender && videoRender.videoId) {
          items.push(VideoRender(richItem.richItemRenderer.content));
        }
      }
      else if (richItem.richSectionRenderer) {
        const richSection = richItem.richSectionRenderer;
        const _richShelfRender = richSection.content.richShelfRenderer;
        if (_richShelfRender) {			    
          const _richContents = _richShelfRender.contents
            ? _richShelfRender.contents
            : false;
            
            for (const item of _richContents) {
              let vContent = item.richItemRenderer.content;
              let videoRender = false;
              
              for (let obj in vContent) {
                if(obj!="videoRenderer") continue
                videoRender = vContent[obj]
              }
              if(!videoRender) continue

              if (videoRender && videoRender.videoId) {
                items.push(VideoRender(vContent));
              }
            }
        }
      }
    });

    const apiToken = await page.apiToken;
    const context = await page.context;
    const nextPageContext = await {
      context: context,
      continuation: contToken,
    };

    return await Promise.resolve({
      items: items,
      nextPage: {
        nextPageToken: apiToken,
        nextPageContext: nextPageContext,
      },
    });
  } catch (ex) {
    await console.error(ex);
    return await Promise.reject(ex);
  }
};

const nextPageOfWhatToWatch = async (
  nextPage,
  lang = "vi",
  country = "VN",
) => {
  country = country.toUpperCase();
  const endpoint =
    await `${youtubeEndpoint}/youtubei/v1/browse?key=${nextPage.nextPageToken}&hl=${lang}&gl=${country}`;
  try {
    const page = await axios.post(
      encodeURI(endpoint),
      nextPage.nextPageContext
    );
    const item1 =
    await page.data.onResponseReceivedActions[0].appendContinuationItemsAction;
    let items = [];
    await item1.continuationItems.forEach((conitem) => {
      if (conitem.richItemRenderer) {
        try{
          let videoRender = conitem.richItemRenderer.content.videoRenderer;
          if (videoRender && videoRender.videoId) {
            items.push(VideoRender(conitem.richItemRenderer.content));
          }
        }catch(ex){}
      } else if (conitem.continuationItemRenderer) {
        try{
        nextPage.nextPageContext.continuation =
          conitem.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
        }catch(ex){}
      }
    });
    return await Promise.resolve({ items: items, nextPage: nextPage });
  } catch (ex) {
    await console.error(ex);
    return await Promise.reject(ex);
  }
};

/**
 * Fetch YouTube trending list.
 * * 0=now, 1=music, 2=gaming, 3=movies *
 * @param {*} tab
 * @param {*} lang
 * @param {*} country
 * @param {*} limit
 * @returns JSON object {items, nextPage}
 */
const FetchTrending = async (
  tab = 0, //0=now, 1=music, 2=gaming, 3=movies
  lang = "vi",
  country = "VN",
  limit = 0
) => {
  tab = Math.max(0, Math.min(3, tab));
  let args = [
    "?bp=6gQJRkVleHBsb3Jl",
    "?bp=4gINGgt5dG1hX2NoYXJ0cw%3D%3D",
    "?bp=4gIcGhpnYW1pbmdfY29ycHVzX21vc3RfcG9wdWxhcg%3D%3D",
    "?bp=4gIKGgh0cmFpbGVycw%3D%3D",
  ];

  tab_String = args[tab];

  let endpoint = await `${youtubeEndpoint}/feed/trending${tab_String}`;
  try {
    country = country.toUpperCase();
    endpoint = `${endpoint}&hl=${lang}&gl=${country}`;
    console.log(endpoint);
    const page = await GetYoutubeInitData(endpoint);

    const sectionListRenderer = await page.initdata.contents
      .twoColumnBrowseResultsRenderer.tabs[tab].tabRenderer.content
      .sectionListRenderer;

    let contToken = await {};

    let items = await [];

    await sectionListRenderer.contents.forEach((content) => {
      if (content.continuationItemRenderer) {
        contToken =
          content.continuationItemRenderer.continuationEndpoint
            .continuationCommand.token;
      } else if (content.itemSectionRenderer) {
        content.itemSectionRenderer.contents.forEach((item) => {
          if (item.shelfRenderer) {
            let shelfRenderer = item.shelfRenderer;
            if (shelfRenderer.content) {
              if (shelfRenderer.content.expandedShelfContentsRenderer) {
                if (shelfRenderer.content.expandedShelfContentsRenderer.items) {
                  shelfRenderer.content.expandedShelfContentsRenderer.items.forEach(
                    (shelfItem) => {
                      let videoRender = shelfItem.videoRenderer;
                      if (videoRender && videoRender.videoId) {
                        items.push(VideoRender(shelfItem));
                      }
                    }
                  );
                }
              }
            }
          }
        });
      }
    });
    const apiToken = await page.apiToken;
    const context = await page.context;
    const nextPageContext = await {
      context: context,
      continuation: contToken,
    };
    const itemsResult = limit != 0 ? items.slice(0, limit) : items;
    return await Promise.resolve({
      items: itemsResult,
      nextPage: {
        nextPageToken: apiToken,
        nextPageContext: nextPageContext,
      },
    });
  } catch (ex) {
    await console.error(ex);
    return await Promise.reject(ex);
  }
};

const GetPlaylistData = async (playlistId, limit = 0) => {
  const endpoint = await `${youtubeEndpoint}/playlist?list=${playlistId}`;
  try {
    const initData = await GetYoutubeInitData(endpoint);
    const sectionListRenderer = await initData.initdata;
    const metadata = await sectionListRenderer.metadata;
    if (sectionListRenderer && sectionListRenderer.contents) {
      const videoItems = await sectionListRenderer.contents
        .twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content
        .sectionListRenderer.contents[0].itemSectionRenderer.contents[0]
        .playlistVideoListRenderer.contents;
      let items = await [];
      await videoItems.forEach((item) => {
        let videoRender = item.playlistVideoRenderer;
        if (videoRender && videoRender.videoId) {
          items.push(VideoRender(item));
        }
      });
      const itemsResult = limit != 0 ? items.slice(0, limit) : items;
      return await Promise.resolve({ items: itemsResult, metadata: metadata });
    } else {
      return await Promise.reject("invalid_playlist");
    }
  } catch (ex) {
    await console.error(ex);
    return await Promise.reject(ex);
  }
};

const GetSuggestData = async (limit = 0) => {
  const endpoint = await `${youtubeEndpoint}`;
  try {
    const page = await GetYoutubeInitData(endpoint);
    const sectionListRenderer = await page.initdata.contents
      .twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content
      .richGridRenderer.contents;
    let items = await [];
    let otherItems = await [];
    await sectionListRenderer.forEach((item) => {
      if (item.richItemRenderer && item.richItemRenderer.content) {
        let videoRender = item.richItemRenderer.content.videoRenderer;
        if (videoRender && videoRender.videoId) {
          items.push(VideoRender(item.richItemRenderer.content));
        } else {
          otherItems.push(videoRender);
        }
      }
    });
    const itemsResult = limit != 0 ? items.slice(0, limit) : items;
    return await Promise.resolve({ items: itemsResult });
  } catch (ex) {
    await console.error(ex);
    return await Promise.reject(ex);
  }
};

/**
 * Fetch channel detail by its channelId
 * @param {*} channelId
 * @returns json of title and content
 */
const GetChannelById = async (channelId) => {
  const endpoint = `${youtubeEndpoint}/channel/${channelId}`;
  try {
    const page = await GetYoutubeInitData(endpoint);
    const header = await page.initdata.header;
    let title = await header.c4TabbedHeaderRenderer.title;
    let avatar = await header.c4TabbedHeaderRenderer.avatar.thumbnails[0].url;
    //let banner = await header.c4TabbedHeaderRenderer.banner.thumbnails[0].url
    const info = {
      channelId: channelId,
      title: title,
      avatar: avatar,
      //banner: banner,
      url: endpoint,
    };
    return info;
    //return await Promise.resolve(info);
  } catch (ex) {
    return {
      channelId: "-",
      title: "-",
      avatar: "-",
      url: "-",
    };
    //return await Promise.reject(ex);
  }
};

//region NOT USED SO FAR
const FetchApiToken = async (
  keyword,
  lang = "vi",
  country = "vn",
  options = []
) => {
  let endpoint = await `${youtubeEndpoint}/results?search_query=${keyword}`;

  try {
    if (Array.isArray(options) && options.length > 0) {
      const type = options.find((z) => z.type);
      if (typeof type == "object") {
        if (typeof type.type == "string") {
          switch (type.type.toLowerCase()) {
            case "video":
              endpoint = `${endpoint}&sp=EgIQAQ%3D%3D`;
              break;
            case "channel":
              endpoint = `${endpoint}&sp=EgIQAg%3D%3D`;
              break;
            case "playlist":
              endpoint = `${endpoint}&sp=EgIQAw%3D%3D`;
              break;
            case "movie":
              endpoint = `${endpoint}&sp=EgIQBA%3D%3D`;
              break;
          }
        }
      }
    }
    endpoint = `${endpoint}&hl=${lang}&gl=${country}`;

    const page = await GetYoutubeInitData(endpoint);
    console.log(page.apiToken);
    const apiToken = await page.apiToken;
    return await Promise.resolve({
      apiToken: apiToken,
    });
  } catch (ex) {
    await console.error(ex);
    return await Promise.reject(ex);
  }
};

const SearchForAudioOnly = async (
  keyword,
  lang = "vi",
  country = "vn",
  withPlaylist = false,
  limit = 0,
  options = []
) => {
  let endpoint = await `${youtubeEndpoint}/results?search_query=${keyword}`;

  try {
    if (Array.isArray(options) && options.length > 0) {
      const type = options.find((z) => z.type);
      if (typeof type == "object") {
        if (typeof type.type == "string") {
          switch (type.type.toLowerCase()) {
            case "video":
              endpoint = `${endpoint}&sp=EgIQAQ%3D%3D`;
              break;
            case "channel":
              endpoint = `${endpoint}&sp=EgIQAg%3D%3D`;
              break;
            case "playlist":
              endpoint = `${endpoint}&sp=EgIQAw%3D%3D`;
              break;
            case "movie":
              endpoint = `${endpoint}&sp=EgIQBA%3D%3D`;
              break;
          }
        }
      }
    }

    endpoint = `${endpoint}&hl=${lang}&gl=${country}`;

    const page = await GetYoutubeInitData(endpoint);
    const apiToken = await page.apiToken;

    return await Promise.resolve({
      apiToken: apiToken,
    });
  } catch (ex) {
    await console.error(ex);
    return await Promise.reject(ex);
  }
};

const GetVideoDetails = async (videoId) => {
  const endpoint = await `${youtubeEndpoint}/watch?v=${videoId}`;
  try {
    const page = await GetYoutubeInitData(endpoint);
    const result = await page.initdata.contents.twoColumnWatchNextResults;
    const firstContent = await result.results.results.contents[0]
      .videoPrimaryInfoRenderer;
    const secondContent = await result.results.results.contents[1]
      .videoSecondaryInfoRenderer;
    const res = await {
      title: firstContent.title.runs[0].text,
      isLive: firstContent.viewCount.videoViewCountRenderer.hasOwnProperty(
        "isLive"
      )
        ? firstContent.viewCount.videoViewCountRenderer.isLive
        : false,
      channel: secondContent.owner.videoOwnerRenderer.title.runs[0].text,
      description: secondContent.attributedDescription.content,
      suggestion: result.secondaryResults.secondaryResults.results
        .filter((y) => y.hasOwnProperty("compactVideoRenderer"))
        .map((x) => compactVideoRenderer(x)),
    };

    return await Promise.resolve(res);
  } catch (ex) {
    return await Promise.reject(ex);
  }
};

const GetShortVideo = async () => {
  const page = await GetYoutubeInitData(youtubeEndpoint);
  const shortResult =
    await page.initdata.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.richGridRenderer.contents
      .filter((x) => {
        return x.richSectionRenderer;
      })
      .map((z) => z.richSectionRenderer.content)
      .filter((y) => y.richShelfRenderer)
      .map((u) => u.richShelfRenderer)
      .find((i) => i.title.runs[0].text == "Shorts");
  const res = await shortResult.contents
    .map((z) => z.richItemRenderer)
    .map((y) => y.content.reelItemRenderer);
  return await res.map((json) => ({
    id: json.videoId,
    type: "reel",
    thumbnail: json.thumbnail.thumbnails[0],
    title: json.headline.simpleText,
    inlinePlaybackEndpoint: json.inlinePlaybackEndpoint || {},
  }));
};
//endregion NOT USED SO FAR

//region COMMON ELEMENTS USED FOR ALL METHODS
const VideoRender = (json) => {
  let isShorts = false
  try {
    if (json && (json.videoRenderer || json.playlistVideoRenderer)) {
      let videoRenderer = null;
      if (json.videoRenderer) {
        videoRenderer = json.videoRenderer;
      } else if (json.playlistVideoRenderer) {
        videoRenderer = json.playlistVideoRenderer;
      }
      var isLive = false;
      if (
        videoRenderer.badges &&
        videoRenderer.badges.length > 0 &&
        videoRenderer.badges[0].metadataBadgeRenderer &&
        videoRenderer.badges[0].metadataBadgeRenderer.style ==
          "BADGE_STYLE_TYPE_LIVE_NOW"
      ) {
        isLive = true;
      }
      if (videoRenderer.thumbnailOverlays) {
        videoRenderer.thumbnailOverlays.forEach((item) => {
          if (item.thumbnailOverlayTimeStatusRenderer && item.thumbnailOverlayTimeStatusRenderer.style){
            if(item.thumbnailOverlayTimeStatusRenderer.style == "LIVE"){
              isLive = true;
            }
            else if(item.thumbnailOverlayTimeStatusRenderer.style == "SHORTS"){
              isShorts = true;
            }
          }
        });
      }
      const id = videoRenderer.videoId;
      
      let thumbnail = ""
      let thumbnails = []
      videoRenderer.thumbnail && (thumbnails = videoRenderer.thumbnail.thumbnails)
      if(thumbnails.length>0){
        thumbnail = thumbnails[thumbnails.length-1].url        
      }
      const title = videoRenderer.title.runs[0].text;
      const channel = videoRenderer.shortBylineText;
      const channelId =
        channel &&
        channel.runs &&
        channel.runs[0] &&
        channel.runs[0].navigationEndpoint &&
        channel.runs[0].navigationEndpoint.browseEndpoint &&
        channel.runs[0].navigationEndpoint.browseEndpoint.browseId
          ? channel.runs[0].navigationEndpoint.browseEndpoint.browseId
          : "";

      const channelThumbnail =
        videoRenderer.channelThumbnailSupportedRenderers &&
        videoRenderer.channelThumbnailSupportedRenderers
          .channelThumbnailWithLinkRenderer &&
        videoRenderer.channelThumbnailSupportedRenderers
          .channelThumbnailWithLinkRenderer.thumbnail &&
        videoRenderer.channelThumbnailSupportedRenderers
          .channelThumbnailWithLinkRenderer.thumbnail.thumbnails &&
        videoRenderer.channelThumbnailSupportedRenderers
          .channelThumbnailWithLinkRenderer.thumbnail.thumbnails[0]
          ? videoRenderer.channelThumbnailSupportedRenderers
              .channelThumbnailWithLinkRenderer.thumbnail.thumbnails[0].url
          : "";
      const duration =
        videoRenderer.lengthText && videoRenderer.lengthText.simpleText
          ? videoRenderer.lengthText.simpleText
          : "";
      const channelTitle =
        videoRenderer.ownerText && videoRenderer.ownerText.runs
          ? videoRenderer.ownerText.runs[0].text
          : "";
      const viewCount = (
        videoRenderer.viewCountText && videoRenderer.viewCountText.simpleText
          ? videoRenderer.viewCountText.simpleText
          : ""
      ).replace(/[^0-9.]+/g, "");
      const publishedAt = videoRenderer.publishedTimeText
        ? videoRenderer.publishedTimeText.simpleText
        : "";
      return {
        vid: id,
        type: isShorts? "shorts":"video",
        thumbnail: thumbnail,
        title,
        channelTitle,
        channelId,
        channelThumbnail,
        duration,
        viewCount,
        publishedAt,
        isLive,
      };
    } else {
      return {};
    }
  } catch (ex) {
    throw ex;
  }
};

const compactVideoRenderer = (json) => {
  const compactVideoRendererJson = json.compactVideoRenderer;

  var isLive = false;
  if (
    compactVideoRendererJson.badges &&
    compactVideoRendererJson.badges.length > 0 &&
    compactVideoRendererJson.badges[0].metadataBadgeRenderer &&
    compactVideoRendererJson.badges[0].metadataBadgeRenderer.style ==
      "BADGE_STYLE_TYPE_LIVE_NOW"
  ) {
    isLive = true;
  }
  const channelId = compactVideoRendererJson.shortBylineText.runs[0]
    ? compactVideoRendererJson.shortBylineText.runs[0].navigationEndpoint
        .browseEndpoint.browseId
    : "";
  const duration = compactVideoRendererJson.lengthText? compactVideoRendererJson.lengthText.simpleText:'00:00';
  const viewCount = compactVideoRendererJson.viewCountText? compactVideoRendererJson.viewCountText.simpleText.replace(
    /[^0-9.]+/g,
    ""
  ):0;
  const publishedAt = compactVideoRendererJson.publishedTimeText.simpleText;
  const channelThumbnail =
    compactVideoRendererJson.channelThumbnail &&
    compactVideoRendererJson.channelThumbnail.thumbnails &&
    compactVideoRendererJson.channelThumbnail.thumbnails[0]
      ? compactVideoRendererJson.channelThumbnail.thumbnails[0].url
      : "";

  const result = {
    vid: compactVideoRendererJson.videoId,
    type: "video",
    thumbnail: compactVideoRendererJson.thumbnail.thumbnails
      ? compactVideoRendererJson.thumbnail.thumbnails[0].url
      : "",
    title: compactVideoRendererJson.title.simpleText,
    channelTitle: compactVideoRendererJson.shortBylineText.runs[0].text,
    channelId,
    channelThumbnail,
    duration,
    viewCount,
    publishedAt,
    isLive,
  };
  return result;
};
//endregion COMMON ELEMENTS USED FOR ALL METHODS

//region EXPORT FUNCTIONS TO WORLD
exports.GetYoutubeInitData = GetYoutubeInitData;
exports.FetchWhatToWatchByYouTube = FetchWhatToWatchByYouTube;
exports.NextPageOfWhatToWatch = nextPageOfWhatToWatch;
exports.FetchTrending = FetchTrending;
exports.SearchVideosByKeyword = SearchVideosByKeyword;
exports.NextPage = nextPage;
exports.GetVideoDetailsWithSuggestion = GetVideoDetailsWithSuggestion;
exports.GetPlaylistData = GetPlaylistData;
exports.GetChannelById = GetChannelById;
exports.SearchForAudioOnly = SearchForAudioOnly;
exports.GetShortVideo = GetShortVideo;
//endregion EXPORT FUNCTIONS TO WORLD
