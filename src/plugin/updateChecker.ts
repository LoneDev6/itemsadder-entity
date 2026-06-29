import compareVersions from 'compare-versions'

type FetchJsonOptions = {
	method?: string
	headers?: Record<string, string>
	body?: BodyInit | null
	timeoutMs?: number
	token?: string | null
}

const RELEASES_LATEST_URL = 'https://api.github.com/repos/ItemsAdder/itemsadder-entity/releases/latest'

export function normalizeVersion(version: unknown) {
	if (typeof version !== 'string') return null
	const normalized = version.trim().replace(/^v/i, '').replace(/\+.*/, '')
	return compareVersions.validate(normalized) ? normalized : null
}

export function isRemoteVersionNewer(currentVersion: unknown, latestVersion: unknown) {
	const current = normalizeVersion(currentVersion)
	const latest = normalizeVersion(latestVersion)
	if (!current || !latest) return false
	return compareVersions(latest, current) > 0
}

async function fetchJson(url: string, {
  method = 'GET',
  headers = {},
	body = undefined,
  timeoutMs = 10000,
  token = null
}: FetchJsonOptions = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'iaentity-plugin',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...headers
      },
      body,
      credentials: 'omit',
      signal: ctrl.signal
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    const data = isJson ? await res.json() : await res.text();

    const response = {
      data,
      status: res.status,
      statusText: res.statusText,
		// @ts-ignore
	  headers: Object.fromEntries(res.headers.entries()),
      url: res.url,
      ok: res.ok,
      request: { url, method }
    };

    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} ${res.statusText}`);
			// @ts-ignore
      err.response = response;
      throw err;
    }

    return response;
  } finally {
    clearTimeout(t);
  }
}

export async function checkForUpdates() {
	try {
		const currentVersion = process.env.PLUGIN_VERSION;
		if (!currentVersion) {
			console.warn('Skipping update check: current version is not defined.');
			return
		}

		const { data } = await fetchJson(RELEASES_LATEST_URL);
		const latestVersion = data.tag_name;

		if (!isRemoteVersionNewer(currentVersion, latestVersion)) {
			return;
		}

		console.log('A new update is available!');

		// @ts-ignore
		Blockbench.showMessageBox({
			title: 'A new update is available!',
			icon: 'update',
			message: `A new update ItemsAdder extension is available! Download version ${latestVersion} from the releases page.`,
			buttons: ['Download', 'Later'],
		}, (buttonIdx) => {
			if (buttonIdx === 0) {
				data.assets.forEach((asset: any) => {
					if (asset.name.endsWith('.js')) {
						// @ts-ignore
						Plugins.all.find(p => p.id == "iaentitymodel").uninstall()

						// @ts-ignore
						new Plugin().loadFromURL(asset.browser_download_url, true)
					}
				});
			}
		});
	} catch (error: any) {
		console.warn('Skipping update check:', error?.message || error);
	}
}