'use strict'
const app = require('../WebApp');
const dbOps = require("./dbOps");
const bookService = require("./BookService");
const readerService = require("./ReaderService");
// 数据库初始化
app.route('/init', 'post', dbOps.initDB);
// 增加新书
app.route('/addNewBook', 'post', bookService.addNewBook);
// 增加书数量
app.route('/addBook', 'post', bookService.addBook);
// 删除书
app.route('/delBook', 'post', bookService.delBook);
//修改书
app.route('/updateBook', 'post', bookService.updateBook);
// 查询书
app.route('/searchBook', 'post', bookService.searchBook);
// 添加读者
app.route('/addNewReader', 'post', readerService.addNewReader);
// 删除读者
app.route('/delReader', 'post', readerService.delReader);
// 修改读者信息
app.route('/updateReader', 'post', readerService.updateReader);
// 查询读者
app.route('/searchReader', 'post', readerService.searchReader);
// 查看读者未还书信息
app.route('/unReturn', 'post', readerService.unReturn);
// 借书
app.route('/borrow', 'post', dbOps.borrow);
// 还书
app.route('/return', 'post', dbOps.return);
// 超期读者列表
app.route('/overDue', 'post', readerService.overDue);
