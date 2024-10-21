'use strict'
const app = require('../WebApp');
const dbOps = require("./dbOps");

// 数据库初始化
app.route('/init', 'post', dbOps.initDB);
// 增加新书
app.route('/addNewBook', 'post', dbOps.addNewBook);
// 增加书数量
app.route('/addBook', 'post', dbOps.addBook);
// 删除书
app.route('/delBook', 'post', dbOps.delBook);
//修改书
app.route('/updateBook', 'post', dbOps.updateBook);
// 查询书
app.route('/searchBook', 'post', dbOps.searchBook);
// 添加读者
app.route('/addNewReader', 'post', dbOps.addNewReader);
// 删除读者
app.route('/delReader', 'post', dbOps.delReader);
// 修改读者信息
app.route('/updateReader', 'post', dbOps.updateReader);
// 查询读者
app.route('/searchReader', 'post', dbOps.searchReader);
// 查看读者未还书信息
app.route('/unReturn', 'post', dbOps.unReturn);
// 借书
app.route('/borrow', 'post', dbOps.borrow);
// 还书
app.route('/return', 'post', dbOps.return);
// 超期读者列表
app.route('/overDue', 'post', dbOps.overDue);
