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

// @flow
const http = require('http')

function Geo(opts/* : Object */) {
  const self = this

  function request(options, callback) {
    const req = http.get(options, (res) => {
      let body = ''

      res.on('data', (chunk) => {
        body += chunk
      })

      res.on('end', () => {
        const response = JSON.parse(body)
        //            console.log("Got a response: ", response);
        callback(null, response)
      })
    })
    req.on('error', e => console.error('Got an error: ', e))
    req.on('socket', (socket) => {
      socket.setTimeout(opts.timeout)
      socket.on('timeout', () => req.abort())
      socket.removeListener('error', () => req.abort())
    })
  }

  function extractGeo(response) {
    const o = {
      country: response.country_name,
      region: response.region_name,
      city: response.city,
      code: response.country_code,
    }

    return o
  }

  self.get = (ip, callback) => {
    //        console.log("QUERYING IP:",ip);
    const options = {
      host: 'freegeoip.net',
      port: 80,
      path: `/json/${ip}`,
      method: 'GET',
    }

    request(options, (err, response) => {
      if (err) { return callback(err) }
      let geo = null
      try {
        geo = extractGeo(response)
      } catch (ex) {
        console.error(ex)
      }

      return callback(null, geo)
    }, true)
  }
}

module.exports = Geo
