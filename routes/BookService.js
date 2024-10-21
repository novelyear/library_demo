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

exports.addBook = function * (req, res) {
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

exports.delBook = function * (req, res) {
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

exports.updateBook = function * (req, res) {
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

exports.searchBook = function * (req, res) {
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