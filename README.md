# CAE Pre-Run Checklist

打開即可勾選的單頁本機清單，不需要建立專案。預設 Sagging 7 項、Shock 2 項與原圖備註。

## 啟動

需 Node.js 18 以上。雙擊 `Start.cmd`，開啟 **http://localhost:3210**。啟動視窗保持開啟，Ctrl+C 可停止。也可在此資料夾執行 `node server.cjs`。不需要安裝套件。

## 操作

- Sagging 藍色、Shock 橘色。Section 的三點選單內，Edit Section 可調整名稱與顏色，共有藍、橘、紫、青、綠、灰六種。
- Done 已確認：綠色；N/A 不適用：灰色；Critical 尚未完成：紅色並顯示文字提醒。
- Checklist Item、Done、Note、N/A、Critical 均可直接操作。Note 與勾選自動儲存於本機。
- N/A 排除於進度分母，且與 Done 互斥。Show Incomplete Only 隱藏已完成與不適用項目。
- Reset 全部勾選清除 Done / N/A；Section 標題旁的 Reset 只清除該區塊。備註、Critical、顏色與項目都保留。
- Section / Item 可隨時新增、編輯、刪除與拖曳排序；Item 可拖到其他 Section。上下移動按鈕與 Edit Item 的 Section 選項提供不用拖曳的操作方式。
- 色彩搭配區塊名稱與狀態文字，不用只靠顏色辨認。
- 沒有 Projects / Templates 管理流程，也不需填寫 Project Name 等欄位。

## 即時保存

本機修改會立即自動保存：勾選 Done／N/A／Critical、輸入 Note、增刪與排序都不需要按額外的儲存按鈕。新增或編輯表單按 Add／Save 後立即保存。重新整理、關閉分頁後，在同一瀏覽器用相同網址開啟，資料仍會保留；相同瀏覽器、相同網址的其他分頁會同步更新。不同電腦或不同瀏覽器不會同步。

GitHub repository 保存程式碼與預設清單，不會自動收集這台電腦的勾選紀錄與備註。

## 本機資料

資料存於瀏覽器 localStorage，key 為 `cae-pre-run-checklist.v2`。固定使用同一瀏覽器與 **http://localhost:3210**。變更 port、主機名稱、瀏覽器或使用無痕視窗會看到另一份資料；清除網站資料會移除清單。請透過伺服器開啟，避免直接雙擊 HTML。

第一次使用新版時會將舊版的模板內容複製為共用清單，保留模板中的編輯與備註。舊版的專案資料仍留在原本的 v1 儲存紀錄中，新介面不再顯示或修改它們。已有新版資料時，優先讀取新版資料，不重複匯入。

## 主要檔案

`index.html` 入口；`styles.css` 版面與區塊／狀態色；`app.js` 勾選與編輯；`model.js` 預設清單、儲存、進度與資料轉換；`server.cjs` 本機伺服器；`model.test.cjs` 資料邏輯測試；`Start.cmd` Windows 啟動檔。

測試：`node --test model.test.cjs`。無套件依賴、無 CDN、無外部字型、無登入或外部服務。


## UI 細修

維持單頁與原資料結構。桌面清單有效寬度上限 1100px，Note 欄加寬，Done／N/A／Critical 維持窄欄並對齊。進度、百分比、進度條與未完成篩選保留，區塊色改為淡藍／淡橘。Section 三點選單提供編輯、上下移動與刪除，Reset 維持可見。Add Item／Add Section 使用原表單與儲存規則，以行內呈現；Cancel 或 Escape 可取消，其他勾選不會清除尚未儲存的行內草稿。Critical 星號維持直接點擊，附有 `Critical item — must be completed before run.` 提示。

已驗證桌面、手機、欄位對齊、行內新增／取消、三點選單、原勾選／篩選／Note／Reset／排序功能；model.js 與細修前完全相同。
