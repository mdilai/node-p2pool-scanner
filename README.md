# node-p2pool-scanner [![JavaScript](https://img.shields.io/badge/language-JavaScript-yellow?labelColor=323330)](https://en.wikipedia.org/wiki/JavaScript) [![NodeJs](https://img.shields.io/badge/runtime-Node.js-brightgreen)](https://en.wikipedia.org/wiki/Node.js) ![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/mdilai/node-p2pool-scanner/bluebird) ![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/mdilai/node-p2pool-scanner/lodash) ![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/mdilai/node-p2pool-scanner/express) [![License](https://img.shields.io/github/license/mdilai/node-p2pool-scanner.svg)](LICENSE)

Fast multi-thread online scanner of public P2Pool-based mining pools. Created for https://p2pool.coinpool.pw/

## Installation
* Run
`npm install` in cloned repo
* Rename `data/config.json.dist` to `data/config.json` and configure it according to your needs.

## Configuration details

### Global section:
```
  "global": {
    "probe_N_IPs_simultaneously": 10,
    "http_socket_timeout": 10000,
    "rescan_list_delay": 5000,
    "access_key": "XXXXXXXXXXXXXX"
  },
```

* **probe_N_IPs_simultaneously** - How much parallel probing for each instance
* **http_socket_timeout** - Timeout in milliseconds for connection from server to both p2pool and ipstack
* **rescan_list_delay** - Delay in milliseconds before scanning addresses from beginning
* **access_key**: - Free API key from [IPStack geolocation API](https://ipstack.com/)

### Instances section
**Each section fork separate process**
``` 
"NAME": {
      "port": PORT,
      "currency": "SYMBOL",
      "addr_file": "/path/to/p2pool/data/XXX/addrs",
      "store_file": "data/p2pool-SYMBOL-public.json"
    },
```
* **NAME**: Custom name that will be parsed by UI (e.g. "btc")
* **port** - Worker port of pools you search for (example `9332` for bitcoin p2pool)
* **currency** - Symbol of currency (e.g. "BTC")
* **addr_file** - path to current address list file of running p2pool instance (e.g. "/opt/p2pool/data/bitcoin/addrs")
* **store_file** - path where to periodically save current state of scanned data

## License

> Copyright (c) 2017-2020 Maksym Dilai

This project is licensed under the [GPL-3.0 License](https://opensource.org/licenses/GPL-3.0) - see the [LICENSE](LICENSE) file for details.
