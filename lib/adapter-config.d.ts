// Settings of the adapter (native in io-package.json) for the type check of main.js
declare global {
    namespace ioBroker {
        interface AdapterConfig {
            /** IP address or host name of the base station, optionally with :port */
            host: string;
            /** polling interval for cyclic.xml in ms */
            polltime: number | string;
            /** interval for the complete static.xml in s */
            staticInterval: number | string;
            /** timeout per request in ms */
            timeout: number | string;
            /** set the clock of the base station when it is wrong */
            syncTime: boolean | string;
        }
    }
}

export {};
