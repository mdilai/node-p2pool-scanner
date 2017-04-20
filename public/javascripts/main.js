// See LICENSE for usage information
// The following lines allow the ping function to be loaded via commonjs, AMD,
// and script tags, directly into window globals.
// Thanks to https://github.com/umdjs/umd/blob/master/templates/returnExports.js
(function (root, factory) {
  if ((typeof define === 'function') && define.amd) {
    define([], factory)
  } else if ((typeof module === 'object') && module.exports) {
    module.exports = factory()
  } else {
    root.ping = factory()
  }
}(this, () => {
  /**
   * Creates and loads an image element by url.
   * @param  {String} url
   * @return {Promise} promise that resolves to an image element or
   *                   fails to an Error.
   */

  const request_image = url =>
    new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = function () {
        resolve(img)
      }

      img.onerror = function () {
        reject(url)
      }

      img.src = `${url}?random-no-cache=${Math.floor((1 + Math.random()) * 0x10000).toString(16)}`
    })


  /**
   * Pings a url.
   * @param  {String} url
   * @param  {Number} multiplier - optional, factor to adjust the ping by.  0.3 works well for HTTP servers.
   * @return {Promise} promise that resolves to a ping (ms, float).
   */

  const ping = (url, multiplier) =>
    new Promise((resolve, reject) => {
      const start = (new Date()).getTime()

      const response = function () {
        let delta = (new Date()).getTime() - start
        delta *= multiplier || 1
        resolve(delta)
      }

      request_image(url).then(response).catch(response)
      // Set a timeout for max-pings, 5s.
      setTimeout((() => {
        reject(Error('Timeout'))
      }), 5000)
    })


  return ping
}))

const numberUnits = [
  'H/s',
  'KH/s',
  'MH/s',
  'GH/s',
  'TH/s',
  'PH/s',
  'EH/s',
  'ZH/s',
  'YH/s',
]

const niceNumber = (nn) => {
  let n = nn
  let i = 0
  while (n >= 1000) {
    if ((i + 1) >= numberUnits.length) {
      return `${Math.round(n * 1000) / 1000} ${numberUnits[i]}`
    }
    n /= 1000
    i += 1
  }
  return `${(n).toFixed(3)} ${numberUnits[i]}`
}

/* global $*/
const getlist = function (options) {
  $.support.cors = true
  $('#sortTable > tbody').empty()
  $.ajax({
    type: 'GET',
    url: `/${options}`,
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    cache: false,
    success(data) {
      let pHTML = ''
      pHTML += `<h2>${data.currency} P2Pool global stats</h2>`
      pHTML += `<p>Global pool speed: ${niceNumber(data.pool_speed)} (est. good shares: ${data.est_good_shares}%)</p>`
      pHTML += `<p>Currently observing ${data.nodes_total} nodes.</p>`
      pHTML += `<p>${data.public_nodes} nodes (${niceNumber(data.totalHashRate)}`
      pHTML += `, ${data.poolstats}%, good shares: ${data.good_shares}%`
      pHTML += `, ${data.totalUsers}`
      pHTML += ' total miners) are public.</p>'
      $('#stats').html(pHTML)
      let donat = data.currency
      if (options === 'dash') {
        pHTML = '<p>sgminer.exe -o stratum+tcp://dash.coinpool.pw:7903 -u Your(DASH)PayoutAddress -p x</p>'
        donat += ' XtEzyjQKqs9KdUxvbmc8tSdqzD7tKb4wdG'
      } else if (options === 'ltc') {
        pHTML = `<p>cgminer.exe -o ${options}.coinpool.pw:${data.info[0].port} -u YourPayoutAddress:x</p>`
        donat += ' LTACM8XjwGUcbrjeLqnw2XRzFZNXmG8vRh'
      } else if (options === 'btc') {
        pHTML = `<p>cgminer.exe -o ${options}.coinpool.pw:${data.info[0].port} -u YourPayoutAddress:x</p>`
        donat += ' 1uwqpNKSL4V12FKbwwDfRJ7ZBuDVT1dkq'
      }
      $('#miner').html(pHTML)
      $('#donations').html(donat)
      $.each(data.info, (i, info) => {
        const img = info.geo.code ? `https://geoiptool.com/static/img/flags/${info.geo.code.toLowerCase()}.gif` : ''
        let id = `${info.ip}:${info.port}`
        ping(`http://${id}/fee`, 0.5).then((delta) => {
          if (info.ip === '5.9.143.40') {
            info.ip = `${options}.coinpool.pw`
          }
          id = `${info.ip}:${info.port}`
          let trHTML = ''
          trHTML += `<tr class="id"><td><a href="http://${id}">${id}</a></td>`
          trHTML += `<td class="country">${info.geo.country} <img src="${img}" align="absmiddle" border="0"></td>`
          trHTML += `<td class="text-right">${info.fee}</td>`
          trHTML += `<td class="text-right">${info.uptime}</td>`
          trHTML += `<td class="text-center">${info.effi}</td>`
          trHTML += `<td class="text-right" data-sort-value="${info.hashrate}">${niceNumber(info.hashrate)}</td>`
          trHTML += `<td class="text-right">${info.users}</td>`
          trHTML += `<td class="text-right">${info.shares}</td>`
          if (delta > 1000) {
            trHTML += `<td class="text-right"><span class="label label-danger">${String(delta.toFixed(2))} ms</span></td>`
          } else if (delta > 250) {
            trHTML += `<td class="text-right"><span class="label label-warning">${String(delta.toFixed(2))} ms</span></td>`
          } else {
            trHTML += `<td class="text-right"><span class="label label-success">${String(delta.toFixed(2))} ms</span></td>`
          }
          if ((info.gwtl > 1000) || (info.gwtl === undefined) || (info.gwtl === '0.00')) {
            trHTML += `<td><span class="label label-danger">${info.gwtl || 'N/A'} ms</span></td>`
          } else if (info.gwtl > 250) {
            trHTML += `<td><span class="label label-warning">${info.gwtl} ms</span></td>`
          } else {
            trHTML += `<td><span class="label label-success">${info.gwtl} ms</span></td>`
          }
          trHTML += `<td class="version">${info.version}</td>`
          $('#sortTable > tbody').append(trHTML)
        }).catch((err) => {
          console.error(err)
        })
      })
    },
  })
}

$(document).ready(() => {
  const table = $('#sortTable').stupidtable()
  let anchor
  table.on('aftertablesort', function (event, data) {
    const { dir } = $.fn.stupidtable
    const arrow = data.direction === dir.ASC ? 'up' : 'down'
    const th = $(this).find('th')
    th.find('.glyphicon').remove()
    th.eq(data.column).append(` <span class="glyphicon glyphicon-chevron-${arrow}"></span> `)
  })
  $('a[data-toggle="tab"]').on('shown.bs.tab', (evt) => {
    anchor = $(evt.target).attr('href')
    anchor = anchor.substr(1, anchor.length)
    getlist(anchor)
  })
  getlist('dash')
})

