// @flow
/**
 * This file is part of node-p2Pool-scanner

 * Copyright (C) 2017  Maksym Dilai

 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Library General Public
 * License as published by the Free Software Foundation; either
 * version 2 of the License, or (at your option) any later version.

 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Library General Public License for more details.

 * You should have received a copy of the GNU Library General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301, USA
*/

import fs from 'fs'

import http from 'http'
import _ from 'lodash'
import debug from 'debug'
import Geo from './geo.mjs'
import conf from '../data/config.json'

const dpc = (t, fn) => {
  if (_.isFunction(t)) {
    return setTimeout(t, 0)
  }
  return setTimeout(fn, t)
}

const parseJSON = str => _.attempt(JSON.parse.bind(null, str))

const iterObj = (obj, cb) => {
  const keys = _.keys(obj)
  let l = _.size(keys)
  while (l--) cb(keys[l])
}

function Scanner(config) {
  const self = this
  //  functions to fetch data from target node IP

  self.config = conf[config]

  self.addr_pending = {}
  //  list of addresses waiting scan
  self.addr_digested = {}
  //  list of scanned addresses
  self.addr_working = {}
  //  list of working addresses
  self.share_addrs = {}
  //  map of share to ip:port

  self.geo = new Geo(self.config.http_socket_timeout)

  const log = debug(`node-p2pool-scanner:${self.config.currency}:info`)
  const error = debug(`node-p2pool-scanner:${self.config.currency}:error`)
  log.log = console.info.bind(console)
  error.log = console.error.bind(console)

  const digestLocalStats = ({ ip, port }, callback) => {
    const options = {
      host: ip,
      port,
      path: '/local_stats',
      method: 'GET',
    }
    return self.request(options, callback)
  }

  const digestShares = ({ ip, port }, callback) => {
    const options = {
      host: ip,
      port,
      path: '/web/my_share_hashes',
      method: 'GET',
    }
    return self.request(options, callback)
  }

  const digestGlobalStats = ({ ip, port }, callback) => {
    const options = {
      host: ip,
      port,
      path: '/global_stats',
      method: 'GET',
    }
    return self.request(options, callback)
  }

  const digestGetworkLatency = ({ ip, port }, callback) => {
    const options = {
      host: ip,
      port,
      path: '/web/graph_data/getwork_latency/last_hour',
      method: 'GET',
    }
    return self.request(options, callback)
  }

  self.render = () => {
    let shares
    let totalHashRate = 0
    let totalUsers = 0
    let totalShares = 0
    let orphanShares = 0
    let deadShares = 0
    iterObj(self.addr_working, (id) => {
      const info = self.addr_working[id]
      totalHashRate += info.totalHashRate
      totalUsers += info.totalUsers
      shares = info.stats.shares
      totalShares += shares.total
      orphanShares += shares.orphan
      deadShares += shares.dead
    })
    const publicGoodRate = totalShares ? (totalShares - orphanShares
        - deadShares) / totalShares : 0
    const res = {
      currency: self.config.currency,
      pool_speed: self.poolstats ? parseInt(self.poolstats.pool_hash_rate, 10) : 'N/A',
      est_good_shares: (self.poolGoodRate * 100).toFixed(2),
      nodes_total: self.nodes_total || 'N/A',
      public_nodes: _.size(self.addr_working),
      totalHashRate: parseInt(totalHashRate, 10),
      totalUsers,
      poolstats: self.poolstats ? ((totalHashRate / self.poolstats.pool_hash_rate) * 100).toFixed(2) : '',
      good_shares: publicGoodRate ? (publicGoodRate * 100).toFixed(2) : '',
      info: [],
    }
    const list = _.sortBy(_.toArray(self.addr_working), ({ ip, goodRate, stats }) => {
      if (ip === '5.9.143.40') { return -1 } else if (goodRate && stats.shares.total) { return goodRate * goodRate * Math.log(stats.shares.total) }
      return 0
    })

    _.forEach(list, (info) => {
      shares = info.stats.shares
      const tmp = {
        ip: info.ip,
        port: self.config.port,
        fee: (info.fee || 0).toFixed(2),
        uptime: info.stats ? (info.stats.uptime / 60 / 60 / 24).toFixed(1) : 'N/A',
        effi: info.goodRate && publicGoodRate ? ((info.goodRate / publicGoodRate) * 100).toFixed(2) : 'N/A',
        version: info.stats.version ? _.replace(info.stats.version, /-g.*/, '') : 'N/A',
        hashrate: parseInt(info.totalHashRate, 10),
        users: info.totalUsers,
        gwtl: info.gwtl,
        shares: shares.total ? `${shares.total - shares.orphan - shares.dead} / ${shares.total}` : 0,
        geo: info.geo,
      }
      res.info.push(tmp)
    })
    return res
  }

  //  defer init
  dpc(1000, () => {
    self.restore_working()
    self.update()
  })
  let p2poolInit = true
  //  main function that reloads 'addr' file from p2pool

  self.update = () => {
    const filename = self.config.addr_file
    //  if we can't read p2pool's addr file, we just cycle on the local default init...
    fs.readFile(filename, { encoding: 'utf8' }, (err, data) => {
      if (err) {
        error(`[${self.config.currency}]: Error reading ${filename}`)
        return
      }
      const addrList = parseJSON(data)
      if (_.isError(addrList)) {
        error(`[${self.config.currency}]: Error reading JSON from ${filename}`)
        return
      }
      self.inject(addrList)
      //  main init
      if (p2poolInit) {
        p2poolInit = false
        while (self.config.probe_N_IPs_simultaneously--) { self.digest() }
        dpc(60 * 1000, self.store_working)
      }
      dpc(1000 * 60, self.update)
    })
  }


  //  store public pools in a file that reloads at startup

  self.store_working = () => {
    const data = JSON.stringify(self.addr_working)
    fs.writeFile(self.config.store_file, data, { encoding: 'utf8' }, (err) => {
      if (err) {
        error(`Error writing to ${self.config.store_file}`)
        return
      }
      dpc(60 * 1000, self.store_working)
    })
  }

  self.calc_node = (inf) => {
    const info = inf
    info.totalUsers = 0
    info.totalHashRate = 0

    iterObj(info.stats.miner_hash_rates, (miner) => {
      info.totalUsers += 1
      info.totalHashRate += info.stats.miner_hash_rates[miner]
    })
    const shares = info.stats.shares
    if (shares.total) {
      info.goodRate = (shares.total - shares.orphan - shares.dead) / shares.total
    }
    if (info.goodRate && info.stats.efficiency) {
      const currentGoodRate = info.goodRate / info.stats.efficiency
      if (self.poolGoodRate) {
        self.poolGoodRate = (self.poolGoodRate + currentGoodRate) / 2
      } else {
        self.poolGoodRate = currentGoodRate
      }
    }

    if (info.shares) {
      const id = `${info.ip}:${info.port}`
      let i = _.size(info.shares)
      while (i--) {
        const share = info.shares[i]
        if (!self.share_addrs[share]) { self.share_addrs[share] = {} }
        self.share_addrs[share][id] = id
      }
    }
  }

  self.remove_node = ({ ip, port }) => {
    const id = `${ip}:${port}`
    iterObj(self.share_addrs, (share) => {
      if (id in self.share_addrs[share]) { return (delete self.share_addrs[share][id]) }
      return true
    })
  }

  //  reload public list at startup

  self.restore_working = () => {
    fs.readFile(self.config.store_file, { encoding: 'utf8' }, (err, data) => {
      if (err) {
        error(`[${self.config.currency}]: Error reading ${self.config.store_file}`)
        return
      }
      self.addr_working = parseJSON(data)
      if (_.isError(self.addr_working)) {
        error(`[${self.config.currency}]: Error reading JSON from ${self.config.store_file}`)
        return
      }
      /*      for (const id in self.addr_working) {
              const info = self.addr_working[id]; */
      iterObj(self.addr_working, (id) => {
        const info = self.addr_working[id]
        self.calc_node(info)
      })
    })
  }

    //  inject new IPs from p2pool addr file

  self.inject = (addrList) => {
    _.forEach(addrList, (info) => {
      const ip = info[0][0]
      const port = self.config.port
      const id = `${ip}:${port}`
      if (!self.addr_digested[id] && !self.addr_pending[id]) {
        self.addr_pending[id] = { ip, port }
      }

      self.nodes_total = _.size(self.addr_digested) + _.size(self.addr_pending)
    })
  }

    //  as we scan pools, we fetch global info from them to update the page

  self.update_global_stats = poolstats => (self.poolstats = poolstats)

    //  execute scan of a single IP

  self.digest = () => {
    const continueDigest = () => {
      self.working_size = _.size(self.addr_working)
      dpc(self.digest)
    }

    if (!_.size(self.addr_pending)) {
      return self.list_complete()
    }

    const info = _.find(self.addr_pending)
    const id = `${info.ip}:${info.port}`
    delete self.addr_pending[id]

    if (/(^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.)|(^0\.0\.0\.)|(^197\.81\.218\.180)/.test(info.ip)) {
      if (self.addr_working[id]) {
        const oinfo = self.addr_working[id]
        self.remove_node(oinfo)
      }
      delete self.addr_working[id]
      self.remove_node(info)
      return continueDigest()
    }

    self.addr_digested[id] = info

      // console.log('P2POOL DIGESTING:', info.ip);
    digestLocalStats(info, (err, stats) => {
      if (!err && stats && (stats.protocol_version >= 1300)) {
          //  Exclude nodes lacking protocol_version or older than 1300
        info.stats = stats
        info.fee = stats.fee
        digestShares(info, (errDigest, shares) => {
          if (!errDigest) { info.shares = shares }

          self.calc_node(info)
          self.addr_working[id] = info
            // console.log('FOUND WORKING POOL: ', info.ip);
        })
        digestGetworkLatency(info, (errGetwork, latency) => {
          let all = 0
          let ii = 0
          if (!errGetwork) {
            let ix = _.size(latency)
            while (ix--) {
              all += latency[ix][1]
              ii += 1
            }
            const avg = (all / ii) * 1000
            info.gwtl = avg.toFixed(2)
              // console.log('GWTL: ', info.gwtl);
          } else {
            error(errGetwork)
            return errGetwork
          }
          return true
        })
        digestGlobalStats(info, (errDigestGlobal, statsDigest) => {
          if (!errDigestGlobal) { self.update_global_stats(statsDigest) }

          if (!info.geo) {
            self.geo.get(info.ip, (errGeo, { code, country, region, city }) => {
              if (!errGeo) {
                info.geo = {}
                info.geo.code = code
                info.geo.country = country
                if (region) { info.geo.country += `, ${region}` }
                if (city) { info.geo.country += `, ${city}` }
              }
            })
          }

          return continueDigest()
        })
      } else {
        if (self.addr_working[id]) {
          const oinfo = self.addr_working[id]
          self.remove_node(oinfo)
        }
        delete self.addr_working[id]
        return continueDigest()
      }
      return true
    })
    return true
  }

    //  schedule restart of the scan once all IPs are done

  self.list_complete = () => {
    self.addr_pending = self.addr_digested
    self.addr_digested = {}
    dpc(self.config.rescan_list_delay, self.digest)
  }

    //  make http request to the target node ip

  self.request = (options, callback) => {
    const httpHandler = http
    const req = httpHandler.request(options, (res) => {
      res.setEncoding('utf8')
      let result = ''
      res.on('data', data => (result += data))
      res.on('end', () => {
        if (options.plain) {
          return callback(null, result)
        }
        const o = parseJSON(result)
        if (_.isError(o)) {
          error(`[${self.config.currency}]: Error parsing JSON from ${options.host}:${options.port}`)
          return callback(o)
        }
        return callback(null, o)
      })
      res.on('error', e => callback(e))
    })
    req.on('socket', (socket) => {
      socket.setTimeout(self.config.http_socket_timeout)
      socket.on('timeout', () => req.abort())
      socket.removeListener('error', () => req.abort())
    })
      /*    req.on('error', e => {
            if (e.code !== 'ECONNRESET')
            callback(e);
            else
            return;
            }); */
    req.on('error', e => callback(e))
    req.end()
  }

  log(`[PID ${process.pid}] Started scanner for ${self.config.currency}`)
}

export default Scanner

