'use strict'

const Database = require("../coSqlite3");

const db = Database("lib.db");

const isValidDate = (dateString) => {
    // 检查格式是否为 yyyy-mm-dd
    const regex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!regex.test(dateString)) {
        return false; // 不符合格式
    }
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // 让NB的js自动修正日期
    // 修正前后一致证明日期合法
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

exports.initDB = function * (req, res) {
    console.log("init DB");
    try{
        // book表
        const booksTableSQL = `CREATE TABLE IF NOT EXISTS books (
            bID varchar(30) PRIMARY KEY,
            bName varchar(30) not null,
            bPub varchar(30),
            bDate DATE,
            bAuthor varchar(20),
            bMem varchar(30),
            bCnt NUMERIC(60,0)  CHECK (bCnt > 0) not null,
            bRemaining NUMERIC(60,0) default 0 CHECK (bRemaining >= 0)
            );`;
        // readers表
        const readersTableSQL = `CREATE TABLE IF NOT EXISTS readers (
            rID varchar(8) PRIMARY KEY not null unique,
            rName varchar(10) not null,
            rSex char(1) CHECK (rSex IN ('男', '女')),
            rDept varchar(10) default null,
            rGrade INTEGER  CHECK (rGrade > 0)
        );`;

        // borrow_records表  bID和rID是外键  borrowID自动分配唯一递增的值
        const borrowRecordsTableSQL = `CREATE TABLE IF NOT EXISTS borrow_records (
            borrowID INTEGER PRIMARY KEY AUTOINCREMENT,
            bID varchar(30) not null,
            rID varchar(8) not null,
            borrowDate DATE not null, 
            dueDate DATE not null,
            returnDate DATE default null,
            FOREIGN KEY (bID) REFERENCES books (bID),
            FOREIGN KEY (rID) REFERENCES readers (rID)
        );`;

        yield db.execSQL(booksTableSQL);
        yield db.execSQL(readersTableSQL);
        yield db.execSQL(borrowRecordsTableSQL);
        
        // 输出数据库lib.db中所有表的名字，以及其中含有的数据项数
        const tables = yield db.execSQL("SELECT name FROM sqlite_master WHERE type='table'");
        console.log(tables);
        for (let table of tables) {
            const count = yield db.execSQL(`SELECT COUNT(*) FROM ${table.name}`);
            console.log(`${table.name}表中有${count[0]['COUNT(*)']}项数据`);
        }

        res.send(`<html><body>
            <div id="result" style="display:none">0</div>
            成功
            </body></html>`);
        return;
        } catch (error) {
        res.send(`<html><body>
            <div id="result" style="display:none">1</div>
            ${error}
            </body></html>`);
        return;
        }
};

exports.borrow = function * (req, res) {
    console.log("借书");
    const {rID, bID} = req.body;
    // 证号、书号未填或不存在
    if(!rID) {
        res.send(`<html><body>
        <div id='result' style='display:none'>1</div>
        该证号不存在
        </body></html>`);
        return ;
    }
    else {
        const reader = yield db.execSQL("select rName from readers where rid = ?", [rID]);
        if(reader.length == 0) {
            res.send(`<html><body>
                <div id='result' style='display:none'>1</div>
                该证号不存在
                </body></html>`);
                return ;
        }
    }
    if(!bID) {
        res.send(`<html><body>
        <div id='result' style='display:none'>2</div>
        该书号不存在
        </body></html>`);
        return ;
    }
    else {
        const book = yield db.execSQL("select bName from books where bid = ?", [bID]);
        if(book.length == 0) {
            res.send(`<html><body>
                <div id='result' style='display:none'>2</div>
                该书号不存在
                </body></html>`);
                return ;
        }
    }
    // 该书借光了，查询books的余量
    const bRemaining = yield db.execSQL("select bRemaining from books where bid = ?", [bID]);
    console.log(bRemaining[0]?.bRemaining);
    const bRemainingNum = bRemaining[0]?.bRemaining;
    if(!bRemaining || bRemainingNum == 0) {
        res.send(`<html><body>
        <div id='result' style='display:none'>5</div>
        该书已经全部借出
        </body></html>`);
        return;
    }
    // 读者已经借了该书，没还
    const already = yield db.execSQL("select borrowID from borrow_records where rid=? and bid=? and returnDate is null;", [rID, bID]);
    if(already.length > 0) {
        res.send(`<html><body>
        <div id='result' style='display:none'>4</div>
        该读者已经借阅该书，且未归还
        </body></html>`);
        return ;
    }
    // 读者有超期书没还：查询读者的借阅历史中超期的或者借的就是这本书的
    let today = new Date().toISOString().split("T")[0];
    const history = yield db.execSQL("select borrowID from borrow_records where rid=? and returnDate is null and dueDate < ?;", [rID, today]);
    if(history.length > 0) {
        res.send(`<html><body>
        <div id='result' style='display:none'>3</div>
        该读者有超期书未还
        </body></html>`);
        return ;
    }
    // 借书数目达到上限，暂定5本
    const borrowed = yield db.execSQL("select borrowID from borrow_records where rid = ? and returnDate is null;")
    if(borrowed.length >= 5) {
        res.send(`<html><body>
        <div id='result' style='display:none'>4</div>
        该读者已达到借阅上限（5本）
        </body></html>`)
        return;
    }

    // 借书逻辑：books表余量减一，借阅表新增记录
    yield db.execSQL("update books set bRemaining = bRemaining - 1 where bid = ?;", [bID]);
    let due = new Date();
    due.setMonth(due.getMonth() + 2);
    due = due.toISOString().split('T')[0];
    yield db.execSQL("insert into borrow_records (bid, rid, borrowDate, dueDate) " +
                     "values " +
                     "(?, ?, ?, ?);", 
                     [bID, rID, today, due]);
    res.send(`<html><body>
        <div id='result' style='display:none'>0</div>
        成功
        </body></html>`);
    return ;
}

exports.return = function * (req, res) {
    console.log("还书");
    const {rID, bID} = req.body;
    // 证号、书号检查
    if(!rID) {
        res.send(`<html><body>
        <div id='result' style='display:none'>1</div>
        该证号不存在
        </body></html>`);
        return ;
    }
    else {
        const reader = yield db.execSQL("select rName from readers where rid = ?", [rID]);
        if(reader.length == 0) {
            res.send(`<html><body>
                <div id='result' style='display:none'>1</div>
                该证号不存在
                </body></html>`);
                return ;
        }
    }
    if(!bID) {
        res.send(`<html><body>
        <div id='result' style='display:none'>2</div>
        该书号不存在
        </body></html>`);
        return ;
    }
    else {
        const book = yield db.execSQL("select bName from books where bid = ?", [bID]);
        if(book.length == 0) {
            res.send(`<html><body>
                <div id='result' style='display:none'>2</div>
                该书号不存在
                </body></html>`);
                return ;
        }
    }
    // 没借
    const history = yield db.execSQL("select borrowID from borrow_records where rid = ? and bid = ? and returnDate is null;", [rID, bID]);
    if(history.length == 0) {
        res.send(`<html><body>
        <div id='result' style='display:none'>3</div>
        该读者并未借阅该书
        </body></html>`);
        return;
    }
    const borrowID = history[0].borrowID;
    // 还书
    yield db.execSQL("update books set bRemaining = bRemaining + 1 where bid = ?;", [bID]);
    let today = new Date().toISOString().split('T')[0];
    yield db.execSQL("update borrow_records set returnDate = ? where borrowID = ?;", [today, borrowID]);
    res.send(`<html><body>
        <div id='result' style='display:none'>0</div>
        成功
        </body></html>`);
    return;
}