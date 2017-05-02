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
import conf from '../data/config.json'
import Scanner from './scanner'
const debug = require('debug')('node-p2pool-scanner:server');
const app = express()

const instances = Object.keys(conf)
const node = {}

if (cluster.isMaster) {
  debug(`Master ${process.pid} is running`);

  const normalizePort = val => {
    const port = parseInt(val, 10);
    if (isNaN(port)) {
      // named pipe
      return val;
     }
     if (port >= 0) {
       // port number
       return port;
     }
     return false;
  }

  const onError = error => {
    if (error.syscall !== 'listen') {
      throw error;
    }
    const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;
    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(`${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  };

  const onListening = () => {
    const addr = server.address();
    const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
    debug(`Listening on ${bind}`);
  };

  let port = normalizePort(process.env.PORT || '3000');
  app.set('port', port);
  const server = app.listen(port, () => debug('Express server listening on port ' + server.address().port))
  server.on('error', onError);
  server.on('listening', onListening);

  app.use(express.static(path.join(__dirname, '../public')))
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:4200')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    return next()
  })

  for (const coin of instances) {
    let forkWorker = cluster.fork({worker: coin})
    app.get(`/${coin}`, (req, res) => {
      forkWorker.send('render')
      forkWorker.on('message', msg => {
        if(msg){
          res.end(JSON.stringify(msg))
        }
      })
   })
  }

  // catch 404 and forward to error handler
  app.use((req, res, next) => {
    const err: any = new Error('Not Found')
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
    debug(`worker ${worker.process.pid} died`);
  })

  } else {
    let scanner = new Scanner(process.env.worker)
      process.on('message', (msg) => {
        if (msg === 'render')
          process.send(scanner.render())
      })
  }

