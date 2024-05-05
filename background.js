let requestIds = {};

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (!details.url.toLowerCase().endsWith(".pdf")) {
      return;
    }

    let headers = {};
    for (let i of details.requestHeaders) {
      headers[i.name.toLowerCase()] = i.value;
    }
    if (headers["range"]) {
      return;
    }

    requestIds[details.requestId] = headers;
    setTimeout(() => {
      delete requestIds[details.requestId];
    }, 10000);
  },
  { urls: ["*://wviewer.kyobobook.co.kr/content/web_ebook/web_pdf/*"] },
  ["requestHeaders", "extraHeaders"]
);

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    let reqHeaders = requestIds[details.requestId];
    if (!reqHeaders) {
      return;
    }

    let headers = {};
    for (let i of details.responseHeaders) {
      headers[i.name.toLowerCase()] = i.value;
    }

    if (headers["content-range"]) {
      return;
    }

    let curlHeaders = { ...reqHeaders };
    curlHeaders["range"] = `bytes=0-${headers["content-length"]}`;

    let cmd = ["curl", `"${details.url}"`];
    for (let key in curlHeaders) {
      cmd.push(`-H "${key}: ${curlHeaders[key]}"`);
    }
    cmd.push(`--output ${+new Date()}.pdf`);

    console.log(`PDF Found: ${cmd.join(" ")}`);
  },
  { urls: ["*://wviewer.kyobobook.co.kr/content/web_ebook/web_pdf/*"] },
  ["responseHeaders", "extraHeaders"]
);
