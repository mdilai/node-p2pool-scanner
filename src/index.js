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

const express = require('express')
const Scanner = require('./scanner')

const router = express.Router()
const dash = new Scanner({ config: 'dash' })
const ltc = new Scanner({ config: 'litecoin' })
const btc = new Scanner({ config: 'bitcoin' })

router.get('/dash', (req, res) => {
//  const render = dash.render();
  res.json(dash.render())
  res.end()
})

router.get('/ltc', (req, res) => {
  const render = ltc.render()
  res.json(render)
  res.end()
})

router.get('/btc', (req, res) => {
  const render = btc.render()
  res.json(render)
  res.end()
})

// export default router;
module.exports = router
