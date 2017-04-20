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
import logger from 'morgan'
import sassMiddleware from 'node-sass-middleware'
import minify from 'express-minify'
import compression from 'compression'
import favicon from 'serve-favicon'
import index from './index'

const app = express()
// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, '../public', 'favicon.png')))
app.use(logger('dev'))
app.use(sassMiddleware({
  src: path.join(__dirname, '../public'),
  dest: path.join(__dirname, '../public'),
  indentedSyntax: true,
  sourceMap: true,
  outputStyle: 'compressed' }),
)
app.use(compression())
app.use(minify())
app.use(express.static(path.join(__dirname, '../public')))
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  return next()
})
app.use('/', index)

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

// export default app;
export default app

