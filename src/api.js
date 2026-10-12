import { Capacitor, CapacitorHttp } from "@capacitor/core";

import { Preferences } from "@capacitor/preferences";

export const native = Capacitor.isNativePlatform();

export let serverURL =

  localStorage.getItem("passage-server") || import.meta.env.VITE_API_URL || "";

let tokenPromise;

export function configureServer(value) {

  const url = new URL(value);

  if (

    url.protocol !== "https:" &&

    !(

      ["localhost", "127.0.0.1", "10.0.2.2"].includes(url.hostname) &&

      url.protocol === "http:"

    )

  )

    throw new Error(

      "Utilisez une adresse HTTPS (ou localhost pour le développement).",

    );

  localStorage.setItem("passage-server", url.origin);

  location.reload();

}

async function token() {

  if (!tokenPromise)

    tokenPromise = (async () => {

      const key = "passage-session:" + serverURL;

      let v = native

        ? (await Preferences.get({ key })).value

        : localStorage.getItem(key);

      if (!v) {

        const r = await request(

          "/session",

          { method: "POST", body: {} },

          false,

        );

        v = r.token;

        if (native) await Preferences.set({ key, value: v });

        else localStorage.setItem(key, v);

      }

      return v;

    })();

  try {

    return await tokenPromise;

  } catch (e) {

    tokenPromise = null;

    throw e;

  }

}

export async function request(path, options = {}, auth = true) {

  if (native && !serverURL)

    throw new Error(

      "Connectez un serveur dans les réglages pour partager les signalements.",

    );

  const controller = new AbortController();

  const delay = path === "/journeys" ? 90000 : 18000;

  const timeout = setTimeout(() => controller.abort(), delay);

  try {

    const headers = { "Content-Type": "application/json" };

    if (options.accountToken) headers.Authorization = "Bearer " + options.accountToken;

    else if (auth) headers.Authorization = "Bearer " + (await token());

    if(auth){const account=sessionStorage.getItem('passage-account:'+serverURL);if(account)headers['X-Account-Token']=account;}
    if(path==='/account/workspace'&&options.accountToken)headers['X-Guest-Token']=await token();
    let response;

    if (native) {

      const result = await CapacitorHttp.request({

        url: serverURL + "/api" + path,

        method: options.method || "GET",

        headers,

        data: options.body,

        connectTimeout: 18000,

        readTimeout: delay,

      });

      response = new Response(typeof result.data === "string" ? result.data : JSON.stringify(result.data), {status: result.status});

    } else response = await fetch(serverURL + "/api" + path, {

      ...options,

      body:

        options.body === undefined ? undefined : JSON.stringify(options.body),

      headers,

      signal: options.signal || controller.signal,

    });

    let data;

    try {

      data = await response.json();

    } catch {

      throw new Error("Le serveur ne répond pas correctement.");

    }

    if (response.status === 401 && auth) {

      const key = "passage-session:" + serverURL;

      if (native) await Preferences.remove({ key });

      else localStorage.removeItem(key);

      tokenPromise = null;

    }

    if (!response.ok) { const error=new Error(data.error || "La demande a échoué."); error.status=response.status; throw error; }

    if(path==='/account/workspace'&&data.resetGuest&&!options.retried){await resetGuestSession();return request(path,{...options,retried:true},false);}
    return data;

  } catch (e) {

    if (e.name === "AbortError")

      throw new Error("La demande a pris trop de temps. Réessayez.");

    if (e instanceof TypeError)

      throw new Error(

        "Connexion impossible. Vérifiez votre réseau et réessayez.",

      );

    throw e;

  } finally {

    clearTimeout(timeout);

  }

}


export async function resetGuestSession(){const key='passage-session:'+serverURL;if(native)await Preferences.remove({key});else localStorage.removeItem(key);tokenPromise=null;}
