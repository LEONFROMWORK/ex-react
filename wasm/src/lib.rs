use wasm_bindgen::prelude::*;
use js_sys::{Array, Object, Reflect};
use web_sys::console;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Cursor;

// 패닉 시 콘솔에 에러 출력
#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}

// Excel 셀 데이터 구조
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ExcelCell {
    pub value: Option<String>,
    pub formula: Option<String>,
    pub cell_type: String,
    pub address: String,
}

// Excel 시트 데이터 구조
#[derive(Serialize, Deserialize, Debug)]
pub struct ExcelSheet {
    pub name: String,
    pub rows: Vec<Vec<ExcelCell>>,
    pub row_count: usize,
    pub col_count: usize,
}

// Excel 워크북 데이터 구조
#[derive(Serialize, Deserialize, Debug)]
pub struct ExcelWorkbook {
    pub sheets: Vec<ExcelSheet>,
    pub metadata: HashMap<String, String>,
    pub has_errors: bool,
    pub processing_time_ms: f64,
}

// 수식 계산 결과
#[derive(Serialize, Deserialize, Debug)]
pub struct FormulaResult {
    pub value: f64,
    pub formula: String,
    pub cell_address: String,
    pub is_error: bool,
    pub error_message: Option<String>,
}

// WASM Excel 파서 구조체
#[wasm_bindgen]
pub struct WasmExcelParser {
    workbook: Option<ExcelWorkbook>,
}

#[wasm_bindgen]
impl WasmExcelParser {
    /// 새로운 WASM Excel 파서 인스턴스 생성
    #[wasm_bindgen(constructor)]
    pub fn new() -> WasmExcelParser {
        WasmExcelParser { workbook: None }
    }

    /// Excel 파일을 파싱하여 JSON 형태로 반환
    /// 
    /// # Arguments
    /// * `data` - Excel 파일의 바이트 배열
    /// 
    /// # Returns
    /// * `Result<JsValue, JsValue>` - 성공 시 워크북 데이터, 실패 시 에러
    #[wasm_bindgen]
    pub fn parse_excel(&mut self, data: &[u8]) -> Result<JsValue, JsValue> {
        let start_time = js_sys::Date::now();
        
        // Calamine을 사용하여 Excel 파일 읽기
        let cursor = Cursor::new(data);
        let mut workbook = match calamine::open_workbook_auto(cursor) {
            Ok(wb) => wb,
            Err(e) => return Err(JsValue::from_str(&format!("Failed to open Excel file: {}", e))),
        };

        let mut sheets = Vec::new();
        let sheet_names = workbook.sheet_names().to_owned();

        // 각 시트 처리
        for sheet_name in sheet_names {
            match self.process_sheet(&mut workbook, &sheet_name) {
                Ok(sheet) => sheets.push(sheet),
                Err(e) => {
                    console::log_1(&JsValue::from_str(&format!("Warning: Failed to process sheet '{}': {}", sheet_name, e)));
                    continue;
                }
            }
        }

        let processing_time = js_sys::Date::now() - start_time;

        let excel_workbook = ExcelWorkbook {
            sheets,
            metadata: self.extract_metadata(),
            has_errors: false, // 에러 탐지 로직 추가 예정
            processing_time_ms: processing_time,
        };

        self.workbook = Some(excel_workbook.clone());

        // JavaScript 객체로 직렬화
        serde_wasm_bindgen::to_value(&excel_workbook)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// 빠른 Excel 메타데이터만 추출 (프리뷰용)
    #[wasm_bindgen]
    pub fn extract_metadata_only(&self, data: &[u8]) -> Result<JsValue, JsValue> {
        let cursor = Cursor::new(data);
        let workbook = match calamine::open_workbook_auto(cursor) {
            Ok(wb) => wb,
            Err(e) => return Err(JsValue::from_str(&format!("Failed to open Excel file: {}", e))),
        };

        let sheet_names = workbook.sheet_names();
        let metadata = js_sys::Object::new();
        
        Reflect::set(&metadata, &"sheet_count".into(), &sheet_names.len().into())?;
        Reflect::set(&metadata, &"sheet_names".into(), &serde_wasm_bindgen::to_value(sheet_names)?)?;
        
        Ok(metadata.into())
    }

    /// 특정 시트의 데이터만 추출
    #[wasm_bindgen]
    pub fn parse_sheet_only(&self, data: &[u8], sheet_name: &str) -> Result<JsValue, JsValue> {
        let cursor = Cursor::new(data);
        let mut workbook = match calamine::open_workbook_auto(cursor) {
            Ok(wb) => wb,
            Err(e) => return Err(JsValue::from_str(&format!("Failed to open Excel file: {}", e))),
        };

        let sheet = self.process_sheet(&mut workbook, sheet_name)?;
        serde_wasm_bindgen::to_value(&sheet)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// 메모리 효율적인 스트리밍 파싱 (대용량 파일용)
    #[wasm_bindgen]
    pub fn parse_streaming(&mut self, data: &[u8], max_rows: Option<usize>) -> Result<JsValue, JsValue> {
        let cursor = Cursor::new(data);
        let mut workbook = match calamine::open_workbook_auto(cursor) {
            Ok(wb) => wb,
            Err(e) => return Err(JsValue::from_str(&format!("Failed to open Excel file: {}", e))),
        };

        let sheet_names = workbook.sheet_names().to_owned();
        let mut sheets = Vec::new();
        let row_limit = max_rows.unwrap_or(10000); // 기본 10,000행 제한

        for sheet_name in sheet_names {
            match self.process_sheet_streaming(&mut workbook, &sheet_name, row_limit) {
                Ok(sheet) => sheets.push(sheet),
                Err(e) => {
                    console::log_1(&JsValue::from_str(&format!("Warning: Failed to process sheet '{}': {}", sheet_name, e)));
                    continue;
                }
            }
        }

        let excel_workbook = ExcelWorkbook {
            sheets,
            metadata: HashMap::new(),
            has_errors: false,
            processing_time_ms: 0.0,
        };

        serde_wasm_bindgen::to_value(&excel_workbook)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}

// 내부 구현 메서드들
impl WasmExcelParser {
    /// 개별 시트 처리
    fn process_sheet(&self, workbook: &mut calamine::Sheets<Cursor<Vec<u8>>>, sheet_name: &str) -> Result<ExcelSheet, String> {
        let range = workbook
            .worksheet_range(sheet_name)
            .map_err(|e| format!("Failed to get range for sheet '{}': {}", sheet_name, e))?;

        let mut rows = Vec::new();
        let (row_count, col_count) = range.get_size();

        // 모든 행 처리
        for (row_idx, row) in range.rows().enumerate() {
            let mut excel_row = Vec::new();
            
            for (col_idx, cell) in row.iter().enumerate() {
                let cell_address = format!("{}{}", 
                    self.col_number_to_letter(col_idx + 1), 
                    row_idx + 1
                );
                
                let excel_cell = ExcelCell {
                    value: if cell.is_empty() { None } else { Some(cell.to_string()) },
                    formula: None, // Calamine에서는 수식 추출이 제한적
                    cell_type: self.get_cell_type(cell),
                    address: cell_address,
                };
                
                excel_row.push(excel_cell);
            }
            
            rows.push(excel_row);
        }

        Ok(ExcelSheet {
            name: sheet_name.to_string(),
            rows,
            row_count,
            col_count,
        })
    }

    /// 스트리밍 방식으로 시트 처리 (메모리 효율적)
    fn process_sheet_streaming(&self, workbook: &mut calamine::Sheets<Cursor<Vec<u8>>>, sheet_name: &str, max_rows: usize) -> Result<ExcelSheet, String> {
        let range = workbook
            .worksheet_range(sheet_name)
            .map_err(|e| format!("Failed to get range for sheet '{}': {}", sheet_name, e))?;

        let mut rows = Vec::new();
        let (total_rows, col_count) = range.get_size();
        let actual_rows = std::cmp::min(total_rows, max_rows);

        // 제한된 행만 처리
        for (row_idx, row) in range.rows().take(actual_rows).enumerate() {
            let mut excel_row = Vec::new();
            
            for (col_idx, cell) in row.iter().enumerate() {
                let cell_address = format!("{}{}", 
                    self.col_number_to_letter(col_idx + 1), 
                    row_idx + 1
                );
                
                let excel_cell = ExcelCell {
                    value: if cell.is_empty() { None } else { Some(cell.to_string()) },
                    formula: None,
                    cell_type: self.get_cell_type(cell),
                    address: cell_address,
                };
                
                excel_row.push(excel_cell);
            }
            
            rows.push(excel_row);
        }

        Ok(ExcelSheet {
            name: sheet_name.to_string(),
            rows,
            row_count: actual_rows,
            col_count,
        })
    }

    /// 셀 타입 결정
    fn get_cell_type(&self, cell: &calamine::DataType) -> String {
        match cell {
            calamine::DataType::Int(_) => "number".to_string(),
            calamine::DataType::Float(_) => "number".to_string(),
            calamine::DataType::String(_) => "string".to_string(),
            calamine::DataType::Bool(_) => "boolean".to_string(),
            calamine::DataType::DateTime(_) => "date".to_string(),
            calamine::DataType::Error(_) => "error".to_string(),
            calamine::DataType::Empty => "empty".to_string(),
        }
    }

    /// 열 번호를 Excel 컬럼 문자로 변환 (1 -> A, 26 -> Z, 27 -> AA)
    fn col_number_to_letter(&self, col_num: usize) -> String {
        let mut result = String::new();
        let mut num = col_num;
        
        while num > 0 {
            num -= 1;
            result = char::from(b'A' + (num % 26) as u8).to_string() + &result;
            num /= 26;
        }
        
        result
    }

    /// Excel 메타데이터 추출
    fn extract_metadata(&self) -> HashMap<String, String> {
        let mut metadata = HashMap::new();
        metadata.insert("parser".to_string(), "wasm-calamine".to_string());
        metadata.insert("version".to_string(), "0.1.0".to_string());
        metadata
    }
}

// 기본 수식 엔진 (HyperFormula 대체)
#[wasm_bindgen]
pub struct WasmFormulaEngine {
    context: HashMap<String, f64>,
}

#[wasm_bindgen]
impl WasmFormulaEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> WasmFormulaEngine {
        WasmFormulaEngine {
            context: HashMap::new(),
        }
    }

    /// 간단한 수식 계산 (SUM, AVERAGE 등)
    #[wasm_bindgen]
    pub fn evaluate_formula(&mut self, formula: &str, context: &JsValue) -> Result<f64, JsValue> {
        // 컨텍스트 데이터 파싱
        if let Ok(ctx_map) = serde_wasm_bindgen::from_value::<HashMap<String, f64>>(context.clone()) {
            self.context = ctx_map;
        }

        // 간단한 수식 파싱 및 계산
        match self.parse_and_calculate(formula) {
            Ok(result) => Ok(result),
            Err(e) => Err(JsValue::from_str(&e)),
        }
    }

    /// SUM 함수 구현
    #[wasm_bindgen]
    pub fn sum(&self, values: &JsValue) -> Result<f64, JsValue> {
        let vals: Vec<f64> = serde_wasm_bindgen::from_value(values.clone())
            .map_err(|e| JsValue::from_str(&format!("Invalid values for SUM: {}", e)))?;
        
        Ok(vals.iter().sum())
    }

    /// AVERAGE 함수 구현
    #[wasm_bindgen]
    pub fn average(&self, values: &JsValue) -> Result<f64, JsValue> {
        let vals: Vec<f64> = serde_wasm_bindgen::from_value(values.clone())
            .map_err(|e| JsValue::from_str(&format!("Invalid values for AVERAGE: {}", e)))?;
        
        if vals.is_empty() {
            return Err(JsValue::from_str("Cannot calculate average of empty array"));
        }
        
        Ok(vals.iter().sum::<f64>() / vals.len() as f64)
    }
}

impl WasmFormulaEngine {
    /// 기본적인 수식 파싱 및 계산
    fn parse_and_calculate(&self, formula: &str) -> Result<f64, String> {
        let formula = formula.trim();
        
        // 간단한 수식 처리 (확장 가능)
        if formula.starts_with("SUM(") && formula.ends_with(")") {
            // SUM 함수 처리
            let range_str = &formula[4..formula.len()-1];
            self.calculate_sum_range(range_str)
        } else if formula.starts_with("AVERAGE(") && formula.ends_with(")") {
            // AVERAGE 함수 처리
            let range_str = &formula[8..formula.len()-1];
            self.calculate_average_range(range_str)
        } else {
            // 단순 숫자 또는 셀 참조
            formula.parse::<f64>()
                .or_else(|_| self.context.get(formula).copied().ok_or_else(|| "Unknown cell reference".to_string()))
        }
    }

    fn calculate_sum_range(&self, range: &str) -> Result<f64, String> {
        // 간단한 범위 처리 (A1:A10 형태)
        // 실제 구현에서는 더 복잡한 범위 파싱 필요
        Ok(0.0) // 임시 구현
    }

    fn calculate_average_range(&self, range: &str) -> Result<f64, String> {
        // 간단한 범위 처리
        Ok(0.0) // 임시 구현
    }
}

// 유틸리티 함수들
#[wasm_bindgen]
pub fn get_wasm_version() -> String {
    "excel-wasm v0.1.0".to_string()
}

#[wasm_bindgen]
pub fn test_wasm_performance() -> f64 {
    let start = js_sys::Date::now();
    
    // 간단한 성능 테스트
    let mut sum = 0.0;
    for i in 0..1000000 {
        sum += i as f64;
    }
    
    let elapsed = js_sys::Date::now() - start;
    console::log_1(&JsValue::from_str(&format!("WASM performance test completed in {}ms, sum: {}", elapsed, sum)));
    
    elapsed
}