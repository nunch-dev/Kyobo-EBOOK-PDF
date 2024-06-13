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

    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      func: async (url, headers) => {
        if (!confirm("PDF Found. Do you want to download?")) {
          return;
        }

        let overlay = document.createElement("div");
        overlay.style.position = "fixed";
        overlay.style.top = "1em";
        overlay.style.left = "1em";
        overlay.style.zIndex = "999999999";
        overlay.textContent = "Downloading... This may take a long time.";

        try {
          document.body.appendChild(overlay);

          let resp = await fetch(url, {
            headers,
          });
          let blob = await resp.blob();
          let objectURL = URL.createObjectURL(blob);

          let link = document.createElement("a");
          link.href = objectURL;
          link.download = +new Date() + ".pdf";

          document.body.appendChild(link);
          link.click();

          document.body.removeChild(link);
          URL.revokeObjectURL(objectURL);
        } catch (err) {
          alert(`error: ${err}`);
        } finally {
          document.body.removeChild(overlay);
        }
      },
      args: [
        details.url,
        {
          ...reqHeaders,
          range: `bytes=0-${headers["content-length"]}`,
        },
      ],
    });
  },
  { urls: ["*://wviewer.kyobobook.co.kr/content/web_ebook/web_pdf/*"] },
  ["responseHeaders", "extraHeaders"]
);
