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

import http from 'http'

const access_key = '8ac4083db135ae1c5137c8f458837415'

function Geo(timeout) {
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
      socket.setTimeout(timeout)
      socket.on('timeout', () => req.abort())
      socket.removeListener('error', () => req.abort())
    })
  }

  function extractGeo({ country_name, region_name, city, country_code }) {
    const o = {
      country: country_name,
      region: region_name,
      city,
      code: country_code,
    }

    return o
  }

  self.get = (ip, callback) => {
    //        console.log("QUERYING IP:",ip);
    const options = {
      host: 'api.ipstack.com',
      port: 80,
      path: `/${ip}?access_key=${access_key}&fields=country_name,region_name,city,country_code`,
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

export default Geo
