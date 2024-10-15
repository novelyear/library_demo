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

        // loan_records表  bID和rID是外键  loanID自动分配唯一递增的值
        const borrowRecordsTableSQL = `CREATE TABLE IF NOT EXISTS borrow_records (
            borrowID INTEGER PRIMARY KEY AUTOINCREMENT,
            bID varchar(30) not null,
            rID varchar(8) not null,
            borrowDate DATE not null, 
            dueDate DATE not null,
            returnDate DATE default null,
            status varchar(10) not null CHECK (status IN ('借出', '已还', '超期')),
            FOREIGN KEY (bID) REFERENCES books (bID),
            FOREIGN KEY (rID) REFERENCES readers (rID)
        );`;

        yield db.execSQL(booksTableSQL);
        yield db.execSQL(readersTableSQL);
        yield db.execSQL(borrowRecordsTableSQL);
        
        // 输出数据库lib.db中所有表的名字，以及其中含有的数据项数
        const tables = yield db.execSQL("SELECT name FROM sqlite_master WHERE type='table'");
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

exports.addNewBook = function * (req, res) {
    console.log("addNewBook");
    const { bID, bName, bPub, bDate, bAuthor, bMem, bCnt } = req.body;
    // 存储错误信息的数组
    const errors = [];
    
    // 检查参数并记录错误信息
    if (!bID || bID.length > 30) {
        errors.push('bID 不能为空或超过30个字符');
    }
    if (!bName || bName.length > 30) {
        errors.push('bName 不能为空或超过30个字符');
    }
    if (bPub && bPub.length > 30) {
        errors.push('bPub 超过30个字符');
    }
    if (bDate && !isValidDate(bDate)) {
        errors.push('bDate 格式不正确');
    }
    if (bAuthor && bAuthor.length > 30) {
        errors.push('bAuthor 超过30个字符');
    }
    if (bMem && bMem.length > 30) {
        errors.push('bMem 超过30个字符');
    }
    if (!bCnt) {
        errors.push('bCnt 不能为空');
    } else {
        const bCntNum = parseInt(bCnt, 10); // 将 bCnt 转换为十进制整数
        if (!Number.isInteger(bCntNum) || bCntNum <= 0) {
            errors.push('bCnt 必须是大于零的整数');
        }
    }
    // 如果存在错误，输出所有错误信息
    if (errors.length > 0) {
        res.send(`<html><body>
            <div id='result' style='display:none'>2</div>
            提交的参数有误：<br>${errors.join('<br>')}
            </body></html>`);
        return;
    }
    // 根据书号查询是否已经存在
    const search = yield db.execSQL("select * from books where bID == ?", [bID]);
    // 如果已经存在，返回错误
    if(search.length > 0) {
        res.send(`<html><body>
        <div id='result' style='display:none'>1</div>
        该书已经存在
        </body></html>`);
        return;
    }
    // 如果不存在，插入数据库
    try {
        yield db.execSQL("INSERT INTO books (bID, bName, bPub, bDate, bAuthor, bMem, bCnt, bRemaining) VALUES (?,?,?,?,?,?,?,?)", 
            [bID, bName, bPub, bDate, bAuthor, bMem, bCnt, bCnt]
        );
    } catch (error) {
        console.error("插入书籍失败:", error);
        res.send(`<html><body>插入失败，未知错误</body></html>`);
        return;
    }
    res.send(`<html><body>
        <div id='result' style='display:none'>0</div>
        成功
        </body></html>`);
    return;
}

exports.addBooks = function * (req, res) {
    console.log("增加书籍数量");
    // 获取书号、增量
    const {bID, bCnt} = req.body;
    const errors = [];
    
    // 检查参数并记录错误信息
    if (!bID || bID.length > 30) {
        errors.push('bID 不能为空或超过30个字符');
    }
    if (!bCnt) {
        errors.push('bCnt 不能为空');
    } else {
        const bCntNum = parseInt(bCnt, 10); // 将 bCnt 转换为十进制整数
        if (!Number.isInteger(bCntNum) || bCntNum <= 0) {
            errors.push('bCnt 必须是大于零的整数');
        }
    }
    // 有误，返回
    if(errors.length > 0) {
        res.send(`<html><body>
            <div id='result' style='display:none'>2</div>
            提交的参数有误：<br>${errors.join('<br>')}
            </body></html>`);
        return;
    }
    // 查询该书是否存在
    const result = yield db.execSQL("select bCnt, bRemaining from books where bID = ?;", [bID]);
    // 若不存在，返回
    if(!result || result.length == 0) {
        res.send(`<html><body>
        <div id='result' style='display:none'>1</div>
        该书不存在
        </body></html>`);
        return;
    }
    // 存在，为bCnt和Remaining增加
    let bookCnt = result[0].bCnt;
    let bookRemaining = result[0].bRemaining;
    const bCntNum = parseInt(bCnt, 10);
    bookCnt += bCntNum;
    bookRemaining += bCntNum;
    yield db.execSQL("update books set bCnt = ?, bRemaining = ? where bID = ?", [bookCnt, bookRemaining, bID]);
    res.send(`<html><body>
        <div id='result' style='display:none'>0</div>
        成功
        </body></html>`);
    return;
}

exports.delBooks = function * (req, res) {
    console.log("删除书籍");
    const {bID, bCnt} = req.body;
    const bCntNum = parseInt(bCnt, 10);
    // 存储错误信息的数组
    const errors = [];
    
    // 检查参数并记录错误信息
    if (!bID || bID.length > 30) {
        errors.push('bID 不能为空或超过30个字符');
    }
    if (!bCnt) {
        errors.push('bCnt 不能为空');
    } else {
        const bCntNum = parseInt(bCnt, 10); // 将 bCnt 转换为十进制整数
        if (!Number.isInteger(bCntNum) || bCntNum <= 0) {
            errors.push('bCnt 必须是大于零的整数');
        }
    }
    // 有误，返回
    if(errors.length > 0) {
        res.send(`<html><body>
            <div id='result' style='display:none'>2</div>
            提交的参数有误：<br>${errors.join('<br>')}
            </body></html>`);
        return;
    }
    // 查询该书是否存在
    const result = yield db.execSQL("select bCnt, bRemaining from books where bID = ?;", [bID]);
    // 若不存在，返回
    if(!result || result.length == 0) {
        res.send(`<html><body>
        <div id='result' style='display:none'>1</div>
        该书不存在
        </body></html>`);
        return;
    }
    // 存在，为bCnt和Remaining增加
    let bookCnt = result[0].bCnt;
    let bookRemaining = result[0].bRemaining;
    if (bCntNum > bookRemaining) {
        res.send(`<html><body>
        <div id='result' style='display:none'>2</div>
        减少的数量大于该书目前在库数量
        </body></html>`);
        return;
    }
    // 减少或删除
    if (bCntNum == bookRemaining && bookRemaining == bookCnt) {
        yield db.execSQL("delete from books where bID = ?", [bID]);
    }
    else {
        bookCnt -= bCntNum;
        bookRemaining -= bCntNum;
        yield db.execSQL("update books set bCnt = ?, bRemaining = ? where bID = ?", [bookCnt, bookRemaining, bID]);
    }
    res.send(`<html><body>
        <div id='result' style='display:none'>0</div>
        成功
        </body></html>`);
    return;
}

exports.updateBooks = function * (req, res) {
    console.log("修改书信息");
    const {bID, bName, bPub, bDate, bAuthor, bMem} = req.body;
    // 存储错误信息的数组
    const errors = [];
    // 动态拼接SQL
    // update books set xx=xx,yy=yy,... where bid = bid

    let fields = [];
    let values = [];

    // 检查参数并记录错误信息
    if (!bID || bID.length > 30) {
        errors.push('bID 不能为空或超过30个字符');
    }
    if (!bName || bName.length > 30) {
        errors.push('bName 不能为空或超过30个字符');
    }
    else if(bName) {
        fields.push(`bName = ?`);
        values.push(bName);
    }
    if (bPub && bPub.length > 30) {
        errors.push('bPub 超过30个字符');
    }
    else if(bPub){
        fields.push(`bPub = ?`);
        values.push(bPub);
    }
    if (bDate && !isValidDate(bDate)) {
        errors.push('bDate 格式不正确');
    }
    else if(bDate){
        fields.push(`bDate = ?`);
        values.push(bDate);
    }
    if (bAuthor && bAuthor.length > 30) {
        errors.push('bAuthor 超过30个字符');
    }
    else if(bAuthor){
        fields.push(`bAuthor = ?`);
        values.push(bAuthor);
    }
    if (bMem && bMem.length > 30) {
        errors.push('bMem 超过30个字符');
    }
    else if(bMem){
        fields.push(`bMem = ?`);
        values.push(bMem);
    }
    // 有误，返回
    if(errors.length > 0) {
        res.send(`<html><body>
            <div id='result' style='display:none'>2</div>
            提交的参数有误：<br>${errors.join('<br>')}
            </body></html>`);
        return;
    }
    // 查询该书是否存在
    const result = yield db.execSQL("select bName from books where bID = ?;", [bID]);
    // 若不存在，返回
    if(!result || result.length == 0) {
        res.send(`<html><body>
        <div id='result' style='display:none'>1</div>
        该书不存在
        </body></html>`);
        return;
    }
    // 存在，修改信息，
    const sql = `update books set ${fields.join(', ')} WHERE bID = ?`;
    values.push(bID);
    yield db.execSQL(sql, values);
        res.send(`<html><body>
        <div id='result' style='display:none'>0</div>
        成功
        </body></html>`);
    return;
}

exports.searchBooks = function * (req, res) {
    console.log("search books");
    const {bID, bName, bPub, bDate0, bDate1, bAuthor, bMem} = req.body;
    // 动态拼接SQL
    let fields = [];
    let values = [];
    const errors = [];
    // 检查参数并记录错误信息
    if (bID && bID.length > 30) {
        errors.push('bID 超过30个字符');
    }
    else if(bID) {
        fields.push(`bID like ?`);
        values.push(`%${bID}%`);
    }
    if (bName && bName.length > 30) {
        errors.push('bName 超过30个字符');
    }
    else if(bName) {
        fields.push(`bName like ?`);
        values.push(`%${bName}%`);
    }
    if (bPub && bPub.length > 30) {
        errors.push('bPub 超过30个字符');
    }
    else if(bPub){
        fields.push(`bPub like ?`);
        values.push(`%${bPub}%`);
    }
    if (bDate0 && !isValidDate(bDate0)) {
        errors.push('bDate0 格式不正确');
    }
    else if(bDate0){
        fields.push(`bDate >= ?`);
        values.push(bDate0);
    }
    if (bDate1 && !isValidDate(bDate1)) {
        errors.push('bDate1 格式不正确');
    }
    else if(bDate1){
        fields.push(`bDate <= ?`);
        values.push(bDate1);
    }
    if (bAuthor && bAuthor.length > 30) {
        errors.push('bAuthor 超过30个字符');
    }
    else if(bAuthor){
        fields.push(`bAuthor like ?`);
        values.push(`%${bAuthor}%`);
    }
    if (bMem && bMem.length > 30) {
        errors.push('bMem 超过30个字符');
    }
    else if(bMem){
        fields.push(`bMem like ?`);
        values.push(`%${bMem}%`);
    }
    // 有误，返回
    if(errors.length > 0) {
        res.send(`
            <html><body>
            <div id='result' style='display:none'>2</div>
            提交的参数有误：<br>${errors.join('<br>')}
            </body></html>`
        );
        return;
    }
    // 动态SQL
    const sql = `SELECT * FROM books ${fields.length ? 'WHERE ' + fields.join(' AND ') : ''}`;
    console.log(sql);
    const result = yield db.execSQL(sql, values);
    if(result.length == 0) {
        res.send(`<html><head><META HTTP-EQUIV="Content-Type" Content="text-html;charset=utf-8"></head>
        <body>
        <table border=1 id='result'></table>
        </body>
        </html>`);
        return;
    }
    else {
        console.log("found!");
        const headers = ['bID', 'bName', 'bCnt', 'bRemaining', 'bPub', 'bDate', 'bAuthor', 'bMem'];
        const rows = result.map(row => {
            const cells = headers.map(header => `<td>${row[header] || ''}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');
        res.send(`
            <html>
            <head><META HTTP-EQUIV="Content-Type" Content="text-html;charset=utf-8"></head>
            <body>
                <table border="1" id="result">
                    ${rows}
                </table>
            </body>
            </html>
        `);
        return ;
    }
}

exports.addNewReader = function * (req, res) {
    console.log("新增读者");
    const {rID, rName, rSex, rDept, rGrade} = req.body;
    const errors = [];
    if(!rID || rID.length > 8) {
        errors.push("证号 不能为空或超过8个字符");
    }
    if(!rName || rName.length > 10) {
        errors.push("姓名 不能为空或超过10个字符");
    }
    if(!rSex || (rSex !== '男' && rSex !== '女')) {
        errors.push("性别 不能为空且只能为'男'或'女'");
    }
    if(rDept && rDept.length > 10) {
        errors.push("系名 不能超过10个字符");
    }
    if(rGrade) {
        const rGNum = parseInt(rGrade, 10); // 将 bCnt 转换为十进制整数
        if (!Number.isInteger(rGNum) || rGNum <= 0) {
            errors.push('年级 必须是正整数');
        }
    }
    if(errors.length > 0) {
        res.send(`<html><body>
            <div id='result' style='display:none'>2</div>
            提交的参数有误：<br>${errors.join('<br>')}
            </body></html>`);
        return;
    }
    const result = yield db.execSQL("select rname from readers where rid = ?", [rID]);
    if(result.length > 0) {
        res.send(`<html><body>
        <div id='result' style='display:none'>1</div>
        该证号已经存在
        </body></html>`);
        return;
    }
    yield db.execSQL("insert into readers" +
        " (rid, rname, rsex, rdept, rgrade)" +
        " values (?,?,?,?,?)", 
        [rID, rName, rSex, rDept, rGrade]);
    res.send(`<html><body>
        <div id='result' style='display:none'>0</div>
        成功
        </body></html>`);
    return;
}

exports.delReader = function * (req, res) {
    console.log("删除读者");
    const rID = req.body.rID;
    // 判断证号合法
    if(!rID || rID.length > 8) {
        res.send(`<html><body>
        <div id='result' style='display:none'>1</div>
        该证号不存在
        </body></html>`);
        return;
    }
    // 查询证号
    const result = yield db.execSQL("select rname from readers where rid = ?;", [rID]);
    if(result == null || result.length == 0) {
        res.send(`<html><body>
            <div id='result' style='display:none'>1</div>
            该证号不存在
            </body></html>`);
        return;
    }
    // 查询借阅记录
    const borrow = yield db.execSQL("select borrowID from borrow_records where rid = ?;", [rID]);
    // 有借阅，不能删
    if(borrow.length > 0) {
        res.send(`<html><body>
        <div id='result' style='display:none'>2</div>
        该读者尚有书籍未归还
        </body></html>`);
        return;
    }
    // 无借阅，删
    else {
        yield db.execSQL("delete from readers where rid = ?", [rID]);
        res.send(`<html><body>
        <div id='result' style='display:none'>0</div>
        成功
        </body></html>`);
        return;
    }
}

exports.updateReader = function * (req, res) {
    console.log("更新书籍信息");
    const {rID, rName, rSex, rDept, rGrade} = req.body;
    const errors = [];
    const fields = [];
    const values = [];
    if(!rID || rID.length > 8) {
        errors.push("证号 不能为空或超过8个字符");
    }
    if(rName) {
        if (rName.length > 10)
            errors.push("姓名 不能超过10个字符");
        else {
            fields.push(`rName = ?`);
            values.push(rName);
        }
    }
    if(rSex) {
        if (rSex !== '男' && rSex !== '女') 
            errors.push("性别 只能为'男'或'女'");
        else {
            fields.push(`rSex = ?`);
            values.push(rSex);
        }
    }
    if(rDept) {
        if(rDept.length > 10)
            errors.push("系名 不能超过10个字符");
        else {
            fields.push(`rDept = ?`);
            values.push(rDept);
        }
    }
    if(rGrade) {
        const rGNum = parseInt(rGrade, 10); // 将 bCnt 转换为十进制整数
        if (!Number.isInteger(rGNum) || rGNum <= 0) {
            errors.push('年级 必须是正整数');
        }
        else {
            fields.push(`rGrade = ?`);
            values.push(rGNum);
        }
    }
    if(errors.length > 0) {
        res.send(`<html><body>
            <div id='result' style='display:none'>2</div>
            提交的参数有误：<br>${errors.join('<br>')}
            </body></html>`);
        return;
    }
    const result = yield db.execSQL("select rname from readers where rid = ?", [rID]);
    if(result.length == 0) {
        res.send(`<html><body>
        <div id='result' style='display:none'>1</div>
        该证号不存在
        </body></html>`);
        return;
    }
    const sql = `update readers set ${fields.join(', ')} WHERE rID = ?`;
    values.push(rID);
    yield db.execSQL(sql, values);
    res.send(`<html><body>
        <div id='result' style='display:none'>0</div>
        成功
        </body></html>`);
    return;
}

exports.searchReader = function * (req, res) {
    console.log("查询读者");
    const {rID, rName, rSex, rDept, rGrade0, rGrade1} = req.body;
    const errors = [];
    const fields = [];
    const values = [];
    if(rID) {
        if(rID.length > 8)
            errors.push("证号 不能为空或超过8个字符");
        else {
            fields.push(`rID like ?`);
            values.push(`%${rID}%`);
        }
    }
    if(rName) {
        if (rName.length > 10)
            errors.push("姓名 不能超过10个字符");
        else {
            fields.push(`rName like ?`);
            values.push(`%${rName}%`);
        }
    }
    if(rSex) {
        if (rSex !== '男' && rSex !== '女') 
            errors.push("性别 只能为'男'或'女'");
        else {
            fields.push(`rSex = ?`);
            values.push(rSex);
        }
    }
    if(rDept) {
        if(rDept.length > 10)
            errors.push("系名 不能超过10个字符");
        else {
            fields.push(`rDept like ?`);
            values.push(`%${rDept}%`);
        }
    }
    if(rGrade0) {
        const rGNum0 = parseInt(rGrade0, 10); // 将 bCnt 转换为十进制整数
        if (!Number.isInteger(rGNum0) || rGNum0 <= 0) {
            errors.push('年级 必须是正整数');
        }
        else {
            fields.push(`rGrade >= ?`);
            values.push(rGNum0);
        }
    }
    if(rGrade1) {
        const rGNum1 = parseInt(rGrade1, 10); // 将 bCnt 转换为十进制整数
        if (!Number.isInteger(rGNum1) || rGNum1 <= 0) {
            errors.push('年级 必须是正整数');
        }
        else {
            fields.push(`rGrade <= ?`);
            values.push(rGNum1);
        }
    }
    if(errors.length > 0) {
        res.send(`<html><head><META HTTP-EQUIV="Content-Type" Content="text-html;charset=utf-8"></head>
            <body>
            <table border=1 id='result'></table>
            </body>
            </html>`);
        return;
    }
    // 动态SQL
    const sql = `SELECT * FROM readers ${fields.length ? 'WHERE ' + fields.join(' AND ') : ''}`;
    console.log(sql);
    const result = yield db.execSQL(sql, values);
    if(result.length == 0) {
        res.send(`<html><head><META HTTP-EQUIV="Content-Type" Content="text-html;charset=utf-8"></head>
        <body>
        <table border=1 id='result'></table>
        </body>
        </html>`);
        return;
    }
    else {
        console.log("found!");
        const headers = ['rID', 'rName', 'rSex', 'rDept', 'rGrade'];
        const rows = result.map(row => {
            const cells = headers.map(header => `<td>${row[header] || ''}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');
        res.send(`
            <html>
            <head><META HTTP-EQUIV="Content-Type" Content="text-html;charset=utf-8"></head>
            <body>
                <table border="1" id="result">
                    ${rows}
                </table>
            </body>
            </html>
        `);
        return ;
    }
}

exports.unReturn = function * (req, res) {
    console.log("查询未还书");
    const rID = req.body.rID;
    if(!rID || rID.length > 8) {
        res.send(`<html><body>
        <div id='result' style='display:none'>1</div>
        该证号不存在
        </body></html>`);
        return;
    }
    const reader = yield db.execSQL("select rName from readers where rID = ?", [rID]);
    if(reader.length == 0) {
        res.send(`<html><body>
        <div id='result' style='display:none'>1</div>
        该证号不存在
        </body></html>`);
        return;
    }
    const records = yield db.execSQL("select borrowID, books.bID, bName, borrowDate, dueDate from borrow_records " +
                                     "join books on borrow_records.bid = books.bid " +
                                     "where " +
                                     "rID = ? and status = '借出' and returnDate is null;",
                                     [rID]);// 借出的
    if(records.length == 0) {
        res.send(`<html><head><META HTTP-EQUIV="Content-Type" Content="text-html;charset=utf-8"></head>
        <body>
        <table border=1 id='result'>
        </table>
        </body>
        </html>`);
        return ;
    }
    else {
        console.log(records);
        const headers = ['bID', 'bName', 'borrowDate', 'dueDate'];
        let now = new Date();
        //  TODO 要更新吗？
        // yield db.execSQL("update borrow_records set status='超期' where dueDate < ?", [now.toISOString().split("T")[0]]);

        const rows = records.map(row => {
            const cells = headers.map(header => `<td>${row[header] || ''}</td>`).join('');
            let dueDate = new Date(row['dueDate']);
            let isOver = dueDate < now ? '是' : '否';
            return `<tr>${cells}<td>${isOver}</td></tr>`;
        })
        res.send(`
            <html>
            <head><META HTTP_EQUIV="Content-Type" Content="text-html;charset=utf-8"></head>
            <body>
                <table border="1" id="result">
                    ${rows}
                </table>
            </body>
            </html>
            `);
        return;
    }
}

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
    if(!bRemaining || bRemaining == 0) {
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
    // TODO 自定义借书失败情况

    // 借书逻辑：books表余量减一，借阅表新增记录
    yield db.execSQL("update books set bRemaining = bRemaining - 1 where bid = ?;", [bID]);
    let due = new Date();
    due.setMonth(due.getMonth() + 2);
    due = due.toISOString().split('T')[0];
    yield db.execSQL("insert into borrow_records (bid, rid, borrowDate, dueDate, status) " +
                     "values " +
                     "(?, ?, ?, ?, '借出');", 
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
    yield db.execSQL("update borrow_records set status = '归还', returnDate = ? where borrowID = ?;", [today, borrowID]);
    res.send(`<html><body>
        <div id='result' style='display:none'>0</div>
        成功
        </body></html>`);
    return;
}

exports.overDue = function * (req, res) {
    console.log("查询超期读者列表");
    // 查询超期记录，提取其中的读者
    let today = new Date().toISOString().split('T')[0];
    // TODO 优化这条SQL
    const results = yield db.execSQL(
        `select * from readers 
         where rid in (select distinct rid from borrow_records where returnDate is null AND dueDate < ?)`,
        [today]
    );
    console.log(results);
    if(results.length == 0) {
        res.send(`<html><head><META HTTP-EQUIV="Content-Type" Content="text-html;charset=utf-8"></head>
        <body>
        <table border=1 id='result'>
        </table>
        </body>
        </html>`);
        return;
    }
    const headers = ['rID', 'rName', 'rSex', 'rDept', 'rGrade'];
    const rows = results.map(row => {
        const cells = headers.map(header => `<td>${row[header] || ''}</td>`).join('');
        return `<tr>${cells}</tr>`;
    })
    res.send(`
        <html><head><META HTTP-EQUIV="Content-Type" Content="text-html;charset=utf-8"></head>
        <body>
        <table border=1 id='result'>
            ${rows}
        </table>
        </body>
        </html>
    `);
    return;
}