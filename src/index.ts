interface ProxyOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const allowedHostname = new Set(['xian2023.github.io', 'localhost']);
const allowedApis = new Set([
  'https://api.live.bilibili.com/room/v1/Room/room_init',
  'https://api.live.bilibili.com/xlive/web-room/v1/index/getDanmuInfo',
  'https://live-open.biliapi.com/v2/app/start',
  'https://live-open.biliapi.com/v2/app/end',
]);

const allowedApiUrl = new Set([
  'https://zm.armoe.cn',
  'https://zj.v.api.aa1.cn/api/qqmusic/demo.php'
]);

function resp404() {
  return new Response(null, { status: 404 });
}

async function handleProxy({ url, method, headers, body }: ProxyOptions) {
  if (!url) return resp404();

  try {
    const urlObj = new URL(url);
    urlObj.hash = '';
    urlObj.search = '';
    let flag = true;
    for (const url of allowedApiUrl) {
      if (urlObj.href.startsWith(url)) {
        flag = false;
        break;
      }
    }
    if (flag && !allowedApis.has(urlObj.href)) return resp404();
  } catch {
    return resp404();
  }

  let res = await fetch(url, { method, headers, body });
  res = new Response(res.body, res);
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Cache-Control', 'no-cache');
  res.headers.delete('Set-Cookie');

  return res;
}

function handleOptions(request: Request) {
  if (request.headers.get('Access-Control-Request-Method') !== null && request.headers.get('Access-Control-Request-Headers') !== null) {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers')!,
      },
    });
  } else {
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, POST, OPTIONS',
      },
    });
  }
}

const handler: ExportedHandler = {
  async fetch(request) {
    const origin = request.headers.get('Origin') || request.headers.get('Referer');
    if (!origin) return resp404();

    try {
      const { hostname } = new URL(origin);
      if (!allowedHostname.has(hostname)) return resp404();
    } catch {
      return resp404();
    }

    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    } else if (request.method === 'POST' && request.headers.get('Content-Type') === 'application/json') {
      try {
        const options = await request.json<ProxyOptions>();
        return handleProxy(options);
      } catch (error) {
        return resp404();
      }
    } else {
      return resp404();
    }
  },
};

export default handler;
