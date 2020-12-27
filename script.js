const $ = require("jquery");
const fs = require("fs");
const { forever } = require("request");
const dialog = require("electron").remote.dialog;
// const { initParams } = require("request");


$(document).ready(function () {
    let db;
    let lsc;
    let lcell;
    $(".menu").on("click", function(){
        let Id=$(this).attr("id");
        $(".menu-options").removeClass("selected");
        $(`#${Id}-menu-options`).addClass("selected");
    })
    $("#grid .cell").on("click", function () {
        let { colId, rowId } = getrc(this);
        let value = String.fromCharCode(65 + colId) + (rowId + 1);
        // console.log(value);
        let cellObject=db[rowId][colId];
        $("#address-input").val(value);
        $("#formula-input").val(cellObject.formula);
        if(lcell && this !=lcell){
            $(lcell).removeClass("selected");
        }
        $(this).addClass("selected");
        if(cellObject.bold){
            $("#bold").addClass("isOn");   
        }else{
            $("#bold").removeClass("isOn");
        }
        lcell=this;
    })

    // $(".content-container").on("scroll",function(){
    //     let scrollY=$(this).scrollTop();
    //     let scrollY=$(this).scrollTop();
    // })
    $(".content-container").on("scroll",function(){
        let scrollY=$(this).scrollTop();
        let scrollX=$(this).scrollLeft();
        $("#top-row,#top-left-cell").css("top",scrollY+"px");
        $("#top-left-cell,#left-col").css("left",scrollX+"px");

    })
    $("#bold").on("click" , function(){
        $(this).toggleClass("isOn");
        let isBold=$(this).hasClass("isOn");
        $("#grid .cell.selected").css("fort-weight",isBold ? "bolder":"normal");
        let cellElem=$("#grid .cell.selected");
        let cellObject=getcell(cellElem);
        cellObject.bold=isBold;
    })
    $("#grid .cell").on("keyup",function(){
        let {rowId}=getrc(this);
        let ht=$(this).height();
        $($("#left-col .cell")[rowId]).height(ht);
    })
    $("#font-family").on("change",function(){
        let fontFamily=$(this).val();
        $("#grid .cell.selected").css("font-family",fontFamily);
        let cellElem=$("#grid .cell.selected");
        let cellObject=getcell(cellElem);
        cellObject.fontFamily=fontFamily;
    })

    //bankground color=>bg
    $("#bg-color").on("change",function(){
        let bgColor=$(this).val();
        let cellElem=$("#grid .cell.selected");
        cellElem.css("background-color",bgColor);
        let cellObject=getcell(cellElem);
        cellObject.bgColor=bgColor;
    })
    $("#New").on("click", function () {
        db = [];
        let AllRows = $("#grid").find(".row");
        for (let i = 0; i < AllRows.length; i++) {
            let row = [];
            let AllCols = $(AllRows[i]).find(".cell");
            for (let j = 0; j < AllCols.length; j++) {
                let cell = {
                    value: "",
                    formula: "",
                    downstream: [],
                    upstream: [],
                    bold:false,
                    underline:false,
                    italic:false,
                    fontFamily:"Arial",
                    fontSize:12,
                    bgColor:"white",
                    textColor:"black",
                    halign:"left"
                }
                $(AllCols[j]).html('');
                $(AllCols[j]).css("font-weight",cell.bold?"bolder":"normal");
                $(AllCols[j]).css("font-style",cell.italic?"italic":"normal");
                $(AllCols[j]).css("text-decoration",cell.underline?"underline":"none");
                $(AllCols[j]).css("font-family",cell.fontfamily);
                $(AllCols[j]).css("font-size",cell.fontSize);
                $(AllCols[j]).css("color",cell.textColor);
                $(AllCols[j]).css("background-color",cell.bgColor);
                $(AllCols[j]).css("text-align",cell.halign);
                row.push(cell);
            }
            db.push(row);
        }
        console.log(db);
        let cellArr = $("grid .cell");
        $(cellArr[0]).trigger("click");
    })
    $("#Save").on("click", async function () {
        let sdb = await dialog.showOpenDialog();
        let fp = sdb.filePaths[0];
        if(fp == undefined){
            console.log("please slect file first");
            return;
        }
        let jsonData = JSON.stringify(db);
        fs.writeFileSync(fp, jsonDate)
    })
    $("#Open").on("click", async function () {
        let sdb = await dialog.showOpenDialog();
        let fp = sdb.filePaths[0];
        if (fp == undefined) {
            console.log("please select file first");
            return;
        }
        let buffer = fs.readFileSync(fp);
        db = JSON.parse(buffer);
        // let AllRows = $(buffer);
        let AllRows = $("#grid").find(".row");
        for (let i = 0; i < AllRows.length; i++) {
            let AllCols = $(AllRows[i]).find(".cell");
            for (let j = 0; j < AllCols.length; j++) {

                $('#grid .cell[r-id=${i}][c-id=${j}]').html(db[i][j].value);
            }
        }
    })


    $("#grid .cell").on("blur", function () {
        let { colId, rowId } = getrc(this);
        // db[rowId][colId].value = $(this).text();
        // console.log(db);
        lsc = this;
        let cellObject = getcell(this);
        if (cellObject.value == $(this).html()) {
            // lsc = this;
            return;
        }
        if (cellObject.formula) {
            rmusnds(cellObject, this);
        }
        cellObject.value = $(this).text();
        updateCell(rowId, colId, cellObject.value);


    })
    $("#formula-input").on("blur", function () {
        let cellObj = getcell(lsc);
        if (cellObj.formula == $(this).val()) {
            return;
        }
        let { colId, rowId } = getrc(lsc);
        if (cellObj.formula) {
            rmusnds(cellObj, lsc);
        }
        cellObj.formula = $(this).val();
        let nval = evaluate(cellobj);
        setusnds(lsc, cellobj.formula);
        updateCell(rowId, colId, nval);

    })

    function evaluate(cellObj) {
        let formula = cellObj.formula;
        console.log(formula);
        for (let i = 0; i < cellObj.upstream.length; i++) {
            let cuso = cellObj.upstream[i];
            let colAdress = String.fromCharCode(cuso.colId + 65);
            let cellAdress = colAdress + (cuso.rowId + 1);
            console.log(cellAdress);
            let fusokival = db[cuso.rowId][cuso.colId].value;
            let formulaCompArr = formula.split(" ");
            formulaCompArr = formulaCompArr.map(function (elem) {
                if (elem == cellAdress) {
                    return fusokival;
                } else {
                    return elem;
                }
            })
            formula = formulaCompArr.join(" ");

        }
        console.log(formula);
        return eval(formula);
    }
    function setusnds(cellElement, formula) {
        formula = formula.replace("(", "").replace(")", "");
        let formulaComponet = formula.splite(" ");
        for (let i = 0; i < formulaComponet.length; i++) {
            let charAt0 = formulaComponet[i].charCodeAt(0);
            if (charAt0 > 64 && charAt0 < 91) {
                let { r, c } = getParentRowCol(formulaComponet[i], charAt0);
                let parentCell = db[r][c];
                let { colId, rowId } = getrc(cellElement);
                let cell = getcell(cellElement);

                parentCell.downstream.push({
                    colId: colId, rowId: rowId
                })
                cell.upstream.push({
                    colId: c,
                    rowId: r
                })
            }
        }
    }
    //delete formula
    function rmusnds(cellObject, cellElem) {
        cellObject.formula = "";
        let { rowId, colId } = getrc(cellElem);
        for (let i = 0; cellObject.upstream.length; i++) {
            let uso = cellObject.upstream[i];
            let fuso = db[uso.rowId][uso.colId];
            let fArr = fuso.downstream.filter(function (dCell) {
                return dCell.colId != colId && dCell.rowId != rowId;
            })
            fuso.downstream = fArr;
        }
        cellObject.upstream = [];

    //     $(AllCols[j]).css("font-weight",cell.bold?"bolder":"normal");
    //     $(AllCols[j]).css("font-style",cell.italic?"italic":"normal");
    //     $(AllCols[j]).css("text-decoration",cell.underline?"underline":"none");
    //     $(AllCols[j]).css("font-family",cell.fontfamily);
    //     $(AllCols[j]).css("font-size",cell.fontSize);
    //     $(AllCols[j]).css("color",cell.textColor);
    //     $(AllCols[j]).css("font-size",cell.bgColor);
    //     $(AllCols[j]).css("font-size",cell.
    // 
    }
    function updateCell(rowId, colId, nval) {
        let cellObject = db[rowId][colId];
        cellObject.value = nval;

        $(`#grid .cell[r-id=${rowId}][c-id=${colId}]`).html(nval);

        for (let i = 0; i < cellObject.downstream.length; i++) {
            let dsocordObj = cellObject.downstream[i];
            let dso = db[dsocordObj.rowId][dsocordObj.colId];
            let dsonval = evaluate(dso);
            updateCell(dsocordObj.rowId, dsocordObj.colId, dsonval);

        }
    }

    function getParentRowCol(cellName, charAt0) {
        let sArr = cellName.split("");
        sArr.shift();
        let sRow = sArr.join("");
        let r = number(sRow) - 1;
        let c = charAt0 - 65;
        return {
            r, c
        };
    }
    function getrc(elem) {
        let colId = Number($(elem).attr("c-id"));
        let rowId = Number($(elem).attr("r-id"));
        return {
            colId, rowId
        }
    }
    function getcell(cellElem) {
        let { colId, rowId } = getrc(cellElem);
        console.log(colId+" "+rowId);
        return db[rowId][colId];
    }
    function init() {
        $("#New").trigger("click");
        // db = [];
        // let AllRows = $("grid").find(".row");
        // for (let i = 0; i < AllRows, length; i++) {
        //     let row = [];
        //     let AllCols = $(AllRows[i]).find(".cell");
        //     for (let j = 0; j < AllCols.length; j++) {
        //         //    DB
        //         let cell = {
        //             value: "",
        //             formula: "",
        //             downstream: [],
        //             upstream: []

        //         }
        //         $(AllCols[j]).html('');

        //         row.push(cell);
        //     }
        // }
        // db.push(row);

    }
    init();
})