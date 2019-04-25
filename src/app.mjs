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
import path from 'path'
import cluster from 'cluster'
import Promise from 'bluebird'
import _ from 'lodash'
import conf from '../data/config.json'
import Scanner from './scanner.mjs'

import Debug from 'debug'
const debug = Debug("node-p2pool-scanner:server")

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const app = express()

const instances = _.keys(conf)
const node = {}

process.setMaxListeners(0);

if (cluster.isMaster) {
  debug(`Master ${process.pid} is running`)

  for (const coin of instances)
    node[coin] = cluster.fork({ worker: coin })

  const normalizePort = (val) => {
    const port = parseInt(val, 10)
    if (isNaN(port)) {
      // named pipe
      return val
    }
    if (port >= 0) {
       // port number
      return port
    }
    return false
  }

  const port = normalizePort(process.env.PORT || '3000')

  const onError = (error) => {
    if (error.syscall !== 'listen') {
      throw error
    }
    const bind = _.isString(port) ? `Pipe ${port}` : `Port ${port}`
    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(`${bind} requires elevated privileges`)
        process.exit(1)
        break
      case 'EADDRINUSE':
        console.error(`${bind} is already in use`)
        process.exit(1)
        break
      default:
        throw error
    }
  }

  const server = app.listen(port, () => debug(`Express server listening on port ${server.address().port}`))

  const onListening = () => {
    const addr = server.address()
    const bind = _.isString(addr) ? `pipe ${addr}` : `port ${addr.port}`
    debug(`Listening on ${bind}`)
  }

  const wrap = fn => (...args) => fn(...args).catch(args[2])
  const stringifyPromise = jsonText => Promise.try(() => JSON.stringify(jsonText))

  app.set('port', port)
  server.on('error', onError)
  server.on('listening', onListening)

  app.use(express.static(path.join(__dirname, '../public')))
/*  app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    res.header('Access-Control-Allow-Origin', 'http://localhost:4200')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    return next()
  }) */

  app.use('/:coin', wrap(async (req, res, next) => {
    res.setHeader('Content-Type', 'application/json')
    if (node[req.params.coin]) {
      node[req.params.coin].send('render')
      node[req.params.coin].on('message', async (msg) => {
        if (msg) {
          try {
            const resp = await stringifyPromise(msg)
            return res.end(resp)
          } catch (err) {
            return next(err)
          }
        } else {
          return next()
        }
      })
    } else {
      return next()
    }
  }))

  // catch 404 and forward to error handler
  app.use((req, res, next) => {
    const err = new Error('Not Found')
    err.status = 404
    return next(err)
  })
  // error handler
  app.use((err, req, res) => {
    // set locals, only providing error in development
    res.locals.message = err.message
    res.locals.error = req.app.get('env') === 'development' ? err : {}
    // render the error page
    res.status(err.status || 500).json({
      message: res.locals.message,
      error: res.locals.error,
    })
  })

  cluster.on('exit', (worker, code, signal) => {
    if (signal) {
      debug(`worker ${worker.process.pid} was killed by signal: ${signal}`)
    } else if (code !== null) {
      debug(`worker ${worker.process.pid} exited with error code: ${code}`)
    } else {
      debug(`worker ${worker.process.pid} died`)
    }
  })
} else {
  const scanner = new Scanner(process.env.worker)
  process.on('message', (msg) => {
    if (msg === 'render') { return process.send(scanner.render()) }
    return true
  })
}

