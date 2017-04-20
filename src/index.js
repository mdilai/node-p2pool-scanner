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

import express from 'express'

import Scanner from './scanner'

const router = express.Router()
const dash: Object = new Scanner('dash')
const ltc: Object = new Scanner('litecoin')
const btc: Object = new Scanner('bitcoin')

router.get('/dash', (req, res) => {
  res.json(dash.render())
  res.end()
})

router.get('/ltc', (req, res) => {
  res.json(ltc.render())
  res.end()
})

router.get('/btc', (req, res) => {
  res.json(btc.render())
  res.end()
})

export default router
