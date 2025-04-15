'use strict'

const Database = require("../coSqlite3");

const db = Database("lib.db");

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
    try {
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
    } catch (error) {
        res.send(`<html><body>
            <div id='result' style='display:none'>2</div>
            提交的参数有误：${error}
            </body></html>`);
        return;
    }
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
    try {
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
        console.log(borrow);
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
    } catch (error) {
        res.send(`<html><body>
            <div id='result' style='display:none'>2</div>
            提交的参数有误：${error}
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
    try {
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
    } catch (error) {
        res.send(`<html><body>
            <div id='result' style='display:none'>2</div>
            提交的参数有误：${error}
            </body></html>`);
    }
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
                                     "rID = ? and returnDate is null;",
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
        now.setHours(0, 0, 0, 0);

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

exports.overDue = function * (req, res) {
    console.log("查询超期读者列表");
    // 查询超期记录，提取其中的读者
    let today = new Date().toISOString().split('T')[0];
    const results = yield db.execSQL(
        `select * from readers 
         where rid in (select distinct rid from borrow_records where dueDate < ?)`,
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