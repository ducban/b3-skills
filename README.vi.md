# sl-mod

[English](README.md)

Dòng trạng thái (status line) cho Claude Code, nhưng làm dưới dạng mod chứ không
phải lệnh `statusLine`. Nó vẽ vào dải (band) ngay phía trên ô gõ (prompt box).

Tên các ô và công tắc như `cache`, `cold gate`, `guard`, `effort`, `reset`,
`speed`, `turn`, `agents` để nguyên tiếng Anh suốt tài liệu này. Đó là chữ hiện
trong `/sl-settings`, dịch ra thì bạn không dò được.

## Vì sao làm mod

Dùng `statusLine` kiểu cũ thì mỗi lần Claude Code vẽ lại màn hình (redraw), nó
phải chạy một lệnh bên ngoài. Trước đây máy này chạy `claude-powerline`, mỗi lần
vẽ mất **khoảng 57 ms**. Phần lớn thời gian đó là Node khởi động. Khởi động xong
nó còn đọc 127 MB bản ghi hội thoại (transcript) để cộng token. Lần nào cũng vậy.

Mod thì khác. Engine nạp nó một lần duy nhất, nên mỗi lần vẽ lại chỉ là gọi một
hàm. Mấy việc đọc nặng dời sang bộ hẹn giờ (timer), không dính vào lúc vẽ.

![Lệnh statusLine chạy một tiến trình và đọc bản ghi mỗi lần vẽ; mod nạp một lần và chỉ đọc bộ nhớ](docs/figures/vi/statusline-vs-mod.svg)

*Hình 1. Một lần vẽ lại tốn gì khi dùng lệnh `statusLine` và khi dùng mod này.
Hai con số 57 ms và 127 MB đo trên máy này.*

Đổi lại có một điểm phải chịu: bên dưới ô gõ không có chỗ cho mod vẽ, nên dải
phải nằm **phía trên**. Dải đi theo ô gõ, không đứng yên một chỗ như dòng
`statusLine` cũ.

Mod lấy gì từ `claude-powerline`, và sau này lấy ý từ mod nào khác, đều ghi
trong `ACKNOWLEDGEMENTS.md`. Mỗi thứ một dòng, có tên người và giấy phép.

## Mod nối với engine thế nào

Lúc vẽ, dải không đi hỏi ai cả. Mọi con số đã nằm sẵn trong bộ nhớ từ trước.
Engine phát sự kiện mỗi khi có yêu cầu đi, mỗi lần đo, mỗi lần compaction, mỗi
lần tác tử con (subagent) chạy. Hook của mod bắt sự kiện đó và ghi số xuống
ngay. Ngoài ra mod có bộ hẹn giờ riêng, mười giây chạy một lần, để soát lại đồng
hồ ngữ cảnh (context gauge). Thêm một lần gọi mạng ba phút một, dùng chung cho
mọi phiên trên cùng máy, để lấy hạn mức (quota) mà engine không đưa. Chỉ có bố
cục là lưu vào `$.store`, nên đóng phiên mở lại vẫn còn.

![Ba tầng: engine đưa sự kiện, mod giữ số, rồi dải và các khung vẽ ra](docs/figures/vi/wiring.svg)

*Hình 2. Mod nghe những sự kiện nào, giữ lại gì, và vẽ ra gì. Đường đứt là chỗ
một module cài sẵn có thể chắn trước mod trên máy có quản trị. Mục Compaction
nói rõ mất gì ở đó.*

Phần còn lại của tài liệu là chi tiết từng ô: đọc từ đâu, cái gì không biết
được, và đã hỏng ở đâu.

## Dải hiện gì

```
  arch     Opus 5 ▮▮▯▯▯ (M)    main ✓   ⌂ 0.1.2
 ct ▰▰▰▰▱ 66%   5h ▰▱▱▱▱ 9% ↻2h14m   7d ▰▰▱▱▱ 39% ↻3d15h   fable ▰▰▱▱▱ 26%
```

Nhiều nhất bốn dòng. Ô nào nằm dòng nào thì vào `/sl-settings` mà xếp. Mặc định
dòng một là mình đang ở đâu, dùng model gì; dòng hai là ngân sách. Dưới ô gõ
không vẽ gì hết, chỗ đó engine giữ cho dòng gợi ý của nó. Mỗi thanh có năm nấc,
mỗi nấc 20%, và làm tròn **lên**: 19% vẫn hiện một nấc chứ không để trống. Hạn
mức (quota) không bao giờ hiện thấp hơn thực tế.

Thanh `5h` có thêm `↻2h14m`, tức còn bấy nhiêu nữa thì cửa sổ reset, phút làm
tròn lên. Khi mốc đã qua mà engine chưa đưa mốc mới thì hiện `↻now`. Mốc mới chỉ
tới cùng với lần đọc sau, không phải đúng giờ chẵn. Thanh `7d` thì cứ mỗi phút
đổi một lần giữa đếm ngược `↻3d15h` và ngày giờ thật `↻Oct 6 11:00pm` theo múi
giờ của terminal. Lý do: tuần thì người ta tính bằng ngày, và ngày là thứ bạn
ghi vào lịch được. Cả hai nguồn đọc đều có mốc reset (`resetsAt` từ engine,
`resets_at` từ endpoint), nên mốc và phần trăm luôn cùng một lần đọc. Phím
`reset` trong `/sl-settings` tắt cả hai mốc. Khi đang bật thì dải tự vẽ lại mỗi
phút, vì giữa hai sự kiện không có gì khác kích nó vẽ.

Có một trường hợp thiếu mốc: lần đọc dùng chung do phiên chạy bản mod cũ hơn ghi
ra. Ngày 22/10/2026, một VPS chạy 0.1.6 và 0.1.4 cạnh nhau, mốc chỉ hiện khi bản
mới hơn là bên vừa gọi mạng. Nay cửa sổ nào thiếu mốc thì mượn mốc từ cửa sổ
cùng kỳ của engine, cái đó lúc nào cũng có. Riêng tuần theo model thì engine
không có bản tương ứng, nên nhận sao để vậy. Cập nhật hết mọi phiên trên máy là
hết chuyện.

## Terminal hẹp, và nền sáng

Dòng nào không đủ chỗ thì bỏ thanh, chỉ giữ số:

```
 ct 14%   5h 8% ↻2h08m   7d 8% ↻5d20h   fable 1%
```

Cùng số liệu, tốn nửa bề ngang. Mod quyết từng dòng, dựa vào `bodyColumns` mà
bề mặt vẽ đưa cho dải. Một dòng chật không kéo dòng khác mất thanh theo. Trên
dòng hẹp, ô `7d` chỉ giữ đếm ngược, vì đó là mặt ngắn hơn.

Hai bảng màu. Nền tối dùng Tokyo Night Moon, đúng màu dòng trạng thái cũ. Nền
sáng dùng Tokyo Night Day. Trước đây dải chỉ có một bảng, trên nền sáng vẫn đọc
được nhưng trông như một thanh đen dán lên trang trắng. Mod đọc màu nền từ
`/config` lúc khởi động, và đọc lại ở `config.set` khi bạn đổi, nên đổi giao diện
là dải đổi theo ngay, không cần mở phiên mới. Có một chỉnh nhỏ: các nấc nền của
Moon từng sát màu nền terminal quá, ngày 22/10/2026 có người không phân biệt nổi
ô với hàng phía sau, nên nay mỗi nấc lên một bậc trong bảng màu.

Mốc reset nằm trong ô của thanh nhưng không ăn theo màu thanh. Sắp tới thì xanh
lơ (trong một phần năm cuối cửa sổ: giờ cuối của 5h, hơn một ngày cuối của 7d),
giữa chừng thì xanh dương, còn xa thì màu thường. Không bao giờ dùng xanh lá,
vàng, đỏ, vì ba màu đó dành cho hạn mức. Đếm ngược đỏ nằm cạnh thanh xanh lá thì
ai cũng tưởng hạn mức có chuyện.

Dòng hai duyệt qua mọi cửa sổ mà endpoint trả về, không gọi đích danh hai cái.
Chỗ này quan trọng: engine chỉ đưa cho mod `five_hour` và `seven_day`, bỏ mất
tuần theo model, tức dòng `Current week (Fable)` trong `/usage`. Dữ liệu đưa cho
status line cũng bị lọc mất dòng đó.

Đi vòng được nhờ `$.session.authorize()`. Nó trả một tay cầm (handle) mờ, đại
diện cho chứng thực Anthropic của phiên. Rồi `$.http.fetch(url, { auth: handle })`
dùng tay cầm đó với một host chính chủ. Chứng thực không bao giờ lọt vào tay
mod, nên mod cũng không bao giờ làm mới nó. Chuyện xoay token đôi khi làm bạn
văng khỏi Claude Code không liên quan gì tới đây. Không phải cài thêm gì, máy
nào cũng chạy.

Mỗi máy chỉ gọi mạng một lần, không phải mỗi phiên. Lý do: mỗi phiên mở ra là
một bản mod riêng với bộ hẹn giờ ba phút riêng. Bốn phiên là bốn lần gọi mỗi kỳ
trên cùng một token, cộng thêm một lần mỗi khi mở phiên, mà endpoint tính giới
hạn theo token. Ngày 11/10/2026 một máy Mac bị 429 suốt mấy tiếng, trong khi
cùng tài khoản ở máy khác vẫn 200. Giờ lần đọc nằm ở `$.store`, chỗ mọi phiên
trên máy dùng chung. Phiên nào thấy nó cũ hơn ba phút thì gọi rồi ghi lại, các
phiên khác dùng ké. Thời gian lùi (backoff) sau một lần 429 cũng dùng chung kiểu
đó. `/sl-debug` in `source=` để bạn biết lần đọc từ đâu ra.

Lần đọc cũ quá mười lăm phút thì không vẽ, quay về hai cửa sổ sống của engine.
Hai thanh đúng còn hơn ba thanh mà một thanh ôm số cũ.

## Compaction

`session.measure` **không** phát khi compaction. Thế nên đồng hồ ngữ cảnh
(context gauge) từng giữ nguyên số cũ, kiểu 38% trên một phiên vừa dọn trống
cửa sổ. Đúng lúc đo, sai lúc nhìn, và kiểu sai này tệ nhất vì trông y như đang
đúng.

Hai hook lo chuyện này. `session.compact` lấy số ngay từ kết quả compaction
(`tokensAfter`), nguồn tốt nhất. Hỏi lại engine không ích gì, vì `context.tokens`
là *"số token đầu vào mà phản hồi gần nhất dựa trên"*, mà ngay sau compaction thì
chưa có phản hồi nào. `classic.PostCompact` là lưới đỡ cho lần compaction nào
không báo số.

Lưới đỡ lúc đầu đọc `context.percent`, chỉ nhận khi số đi xuống, với giả định là
lần đọc chưa bắt kịp sẽ còn giữ số trước compaction. Không phải. Engine **bỏ
hẳn trường đó**: ngay sau compaction, `usage.context` chỉ còn `{ window }` cho
tới khi phản hồi kế tiếp về. Ngày 19/10/2026, `/context` nói 9% mà dải vẫn giữ
20% từ trước compaction. Lưới đỡ đã hỏi, không thấy `percent`, nên giữ nguyên
cái cũ. Một phản hồi sau engine báo 10% và đồng hồ tự bắt kịp. Lỗ hổng nằm đúng
khoảng giữa compaction và phản hồi kế tiếp, mà đó cũng là lúc bạn nhìn đồng hồ.

Giờ cả hai hook lùi về `$.session.usage({ breakdown: 'summary' })` và lấy
`breakdown.percentage`. Đó là mức đầy như `/context` ước, tính tại chỗ không gửi
yêu cầu nào, và là con số duy nhất tồn tại trong khoảng trống đó. Nó đo theo cửa
sổ compaction chứ không theo cửa sổ của model, nên có thể cao hơn `percent` một
điểm trên cùng bản ghi, giống hệt `/context`. Phép kiểm "số đi xuống" giữ lại
làm đường cuối khi không có breakdown.

`/sl-debug` giờ in `band ct:` cạnh `context:` thô của engine: số của chính đồng
hồ, hook nào ghi, ghi cách đây bao lâu. Nhờ vậy "engine ngừng báo" và "dải ngừng
nghe" không còn giống nhau. Nó in cả số của breakdown.

Rồi tới 26/10/2026 cả hai hook không chạy. Trên máy có cài đặt quản trị, hoặc
tài khoản Team hay Enterprise, Claude Code 2.1.310 đặt module cài sẵn
`cc-plugin-sec-default@builtin` ở ngoài cùng, và module đó không chuyển tiếp
`session.compact` lẫn `classic.PostCompact`. Engine ghi *"sl-mod: its
session.compact hook was skipped. \"cc-plugin-sec-default\" runs first and sent
the event on past it"*, dải không nghe thấy gì. Một lần `/compact` đưa phiên từ
202k token xuống 15k, đồng hồ vẫn 20% trong khi `/context` nói 6%. (Module đó
cũng giữ `classic.SessionStart` và `classic.PostToolUse`, chính là mấy thông báo
mở đầu mọi phiên trên máy như vậy. Hai cái đó vô hại ở đây, vì `session.start`
đã lấy số đo đầu tiên.)

Nên đồng hồ giờ tự soát lại giả định của mình, theo bộ hẹn giờ riêng của mod,
thứ không ai chắn trước được. Mười giây một lần nó đọc mức dùng thô, một lời gọi
tại chỗ. Engine bỏ `context.percent` ngay khi compaction xảy ra và chỉ trả lại ở
phản hồi kế tiếp. Vậy nếu đồng hồ đang giữ số mà lần đọc không có số, tức là vừa
lỡ một compaction, và nó lấy breakdown y như hai hook kia. Lúc bình thường nhịp
này không làm gì: không ước, không vẽ lại. `/sl-debug` hiện đồng hồ ghi theo lối
này là `from=tick breakdown`. Chỗ sửa đúng thuộc về Claude Code, module cài sẵn
phải gọi `next(e)`. Mod này chỉ thôi trông chờ vào đó.

Nhịp đó vẫn trễ được tới mười giây, mà yêu cầu bạn gửi ngay sau compaction lại
là lúc bạn nhìn đồng hồ. Nên mod đọc thêm `turn.step`, sự kiện duy nhất mà mod
nào cũng nhận được. Mỗi yêu cầu của vòng chính nói nó mang bao nhiêu tin nhắn
(`messageCount`). Yêu cầu nào mang chưa tới một nửa so với yêu cầu trước thì là
yêu cầu đầu tiên sau compaction, vì bản ghi bên dưới đã bị viết lại. Đồng hồ lấy
breakdown ngay trên yêu cầu đó, không đợi nhịp kế. `/sl-debug` hiện là
`from=turn.step breakdown`. Vòng của tác tử con (subagent) mang số nhỏ riêng nên
bỏ qua. `/clear` cũng làm số giảm một nửa và cũng rơi vào cửa sổ vừa dọn trống,
đúng ý. Phép thử "giảm một nửa" là của Karan Bansal, từ
[cache-tax](https://github.com/karanb192/cache-tax); xem `ACKNOWLEDGEMENTS.md`.

Đường `session.compact` không có test. Bộ thử không có bản ghi, nên `e.messages`
không phải danh sách và mọi hook trong chuỗi bị bỏ qua. Lưới đỡ thì thử với đúng
hình dạng thật của lần đọc sau compaction: không có `percent`, breakdown chỉ có
khi hỏi, và phép kiểm khi `percent` có mặt. Bộ hẹn giờ thử riêng: lần đọc mất
`percent` trong khi đồng hồ đang giữ số, nhịp lấy breakdown, bám theo nó khi
khoảng trống còn, rồi rút lui khi số đẩy tới trở lại. Test `turn.step` dẫn luồng
từ một đáy giả: số tăng dần, số nhỏ của tác tử con, rồi vòng chính rớt xuống một
phần ba và đồng hồ lấy breakdown.

## Trạng thái

Bản 0.1.17, cài từ marketplace của chính repo này ở scope **user**, nên phiên
nào trên máy cũng có. Sáu lệnh đều chạy. 32 test qua `claude plugin test`,
`tsc -p .` sạch, `claude plugin validate` qua.

Số nào lấy định kỳ đều kèm một ghi chú nói vì sao nó trống, và `/sl-debug` in
ghi chú đó ra. Lý do: ô trống trông giống hệt nhau dù phép dò trả lời "không có
nhánh" hay ném lỗi giữa đường, và im lặng kiểu đó từng tốn khá nhiều thời gian ở
đây.

## Help và settings là tab

Không phải dựng gì thêm. Engine không vẽ tiêu đề cho một khung (pane) đứng một
mình, nhưng vừa mở khung thứ hai là nó vẽ dải tab. `PaneOpenArgs.title` ghi:
"The pane's tab while more than one pane is open (with one, no title is drawn)",
và sự kiện vẽ `Pane` ghi: "one shown, the rest tabs".

Nên `/sl-help`, `/sl-settings` và `/sl-agents` lệnh nào cũng mở cả ba khung rồi
đưa khung của mình lên trước. `focus: true` vừa đưa lên vừa lấy tiêu điểm, nên
khung được gọi mở sau cùng. Muốn xem tab kia thì bấm vào, hoặc Tab rồi Enter.

`/sl-debug` vẫn là chữ thuần. Nó là bản đổ ra để bạn chọn, chép rồi dán sang chỗ
khác, mà thân khung thì không chép được.

## Dòng gợi ý: vì sao không vẽ gì ở đó nữa

Thử hai cách, không cách nào ăn.

Một cây `flexDirection: 'column'` ở `PromptHint` **không** cho ra hai hàng. Nó
nhét cả nút điều khiển lẫn chuỗi `hint` của engine vào một dòng rồi gập, chữ của
engine gãy ngang:

```
⏵⏵ auto mode on · effort: [ ▲ ] [ ▼ ] · [ help ]
                    (shift+tab to cycle)
```

Phím `4`, `5`, `0` cũng không bao giờ bắn ở đó, đo được chứ không đoán. Kiểu dữ
liệu ghi rõ: gõ một chữ số từ ô trống thì bấm Button của dải, và chỉ của dải.
Đúng là vậy.

Nên chỗ đó để yên. Nút điều khiển dời vào `/sl-settings`, nơi khung giữ bàn phím
và phím tắt của Button chạy được.

## Effort là chọn, không phải bấm lên xuống

Nút tăng giảm cần biết đang ở mức nào, mà mức đó là đoán. `turn.step` chỉ mang
`effort` khi yêu cầu nêu tên một mức, *"cài đặt của phiên hoặc mặc định của
model, vắng với model không có effort"*, và trong phiên này nó chưa mang bao giờ.
Bấm "tăng" từ mốc không biết thì ra `medium + 1`, vẽ `(H)` cho một phiên chẳng
hề ở high.

Sửa hai chỗ, thiếu một là không xong:

- **Giờ đọc được mức.** Các hook classic mang `effort.level`, *"sau mọi lần hạ
  ngầm"*, trong bất cứ sự kiện nào phát ra lúc dùng công cụ. `classic.PostToolUse`
  lo lượt có dùng công cụ, `classic.Stop` lo lượt không dùng. Mỗi hook đọc một
  chuỗi rồi chuyển sự kiện đi tiếp.
- **Nút điều khiển là danh sách, không phải nút đẩy.** `/sl-settings` liệt kê
  `session`, `L`, `M`, `H`, `X`, `✦`, và phím `e` bước qua từng mức. `session`
  đứng đầu, nghĩa là mod không có ý kiến: `turn.step` cho mọi yêu cầu qua nguyên
  vẹn và dải báo đúng cái phiên đang làm. Chọn từ danh sách thì không sai được
  chỗ xuất phát.

Khác với bố cục, lựa chọn effort **không** lưu. Bố cục là sở thích, giữ qua
phiên; effort là của những yêu cầu phiên này gửi, hết phiên là thôi.

## Guard

Dải trước giờ chỉ để đọc. Guard là thứ đầu tiên trên đó biết hỏi lại.

Có bốn lệnh shell vứt đi thứ mà git lẫn đĩa đều không trả lại: `rm -rf`,
`git reset --hard`, `git clean`, và force push. Bật guard lên, một lời gọi Bash
dính một trong bốn lệnh đó sẽ bị giữ lại trước khi chạy. Mod đo thứ nó sắp phá,
rồi bản báo cáo chiếm dòng một của dải:

```
 ╭─ ⚠ guard · rm -rf ────────────────────────────────────────────────╮
 │ command  rm -rf build                                              │
 │ would    delete 1,204 files · 38 MB                                │
 │   build/index.js                                                   │
 │   build/chunk-1f3a.js                                              │
 │   build/assets/logo.svg                                            │
 │   + 1,201 more                                                     │
 │ 1: run   2: refuse   Claude is waiting on your answer              │
 ╰────────────────────────────────────────────────────────────────────╯
 ct ▰▰▰▰▱ 66%   5h ▰▱▱▱▱ 9% ↻2h14m   7d ▰▰▱▱▱ 39% ↻3d15h
```

![Năm bước: Claude gọi Bash, mod giữ lệnh, đo, báo cáo trong dải, Claude đọc câu trả lời](docs/figures/vi/guard.svg)

*Hình 3. Một lệnh Bash nguy hiểm đi qua những bước nào, từ lúc Claude gọi tới
lúc shell chạy, hoặc không chạy.*

Bấm `1` thì chạy đúng như viết. Bấm `2`, hoặc Esc ở lượt đó, hoặc im lặng mười
phút, hoặc chính guard bị lỗi, đều là từ chối. Claude đọc được lý do, *"the user
pressed refuse. It would have: delete 1,204 files"*, nên không thử lại đúng dòng
đó. `refuse` giữ tiêu điểm, nên Enter cũng là từ chối. Dòng ngân sách vẫn nằm
dưới báo cáo; dòng danh tính là dòng bạn ít cần nhất lúc đó. Lệnh đang bị giữ
vẫn hiện kể cả khi bạn đã ẩn dải bằng `/sl`: đó là một câu hỏi, không trả lời
thì im lặng thành câu trả lời.

Mỗi lệnh đo gì:

| Lệnh | Hiện |
|---|---|
| `rm -r`, `rm -f`, `rm -rf` | số file và dung lượng sẽ xoá; glob và `~` đã mở rộng |
| `git reset --hard` | các file có thay đổi chưa commit, và `git diff --shortstat` |
| `git clean` | thứ `git clean -n` với cùng cờ sẽ xoá |
| `git push --force`, `-f`, `--force-with-lease`, `+ref` | các commit trên nhánh remote mà lần push sẽ làm mất, tính tới lần fetch gần nhất |

`cd dir &&` hay `git -C dir` đứng trước thì chỗ đo dời theo. Đường dẫn đưa cho
`bash`, `find`, `du`, `git` dưới dạng **tham số**, không bao giờ là mã, nên không
có gì trong tên file chạy được. Đường dẫn tương đối được thêm `./` phía trước,
nên `find` không đọc nhầm tên file kiểu `-delete` thành hành động.

Giữ lại bằng cách nào: hook chỉ có mười giây, không đủ đợi người, nhưng thời
gian nằm trong một lời gọi `$` không tính vào đó. Nên phần giữ là một vòng lặp
ngủ từng phần tư giây qua `$.process.run(['sleep'])`, tới khi `onPress` của một
nút đặt quyết định, hoặc `next.signal` của lượt báo huỷ, hoặc hết mười phút. Mỗi
lúc chỉ giữ một lệnh; lệnh nguy hiểm thứ hai xếp hàng sau lệnh thứ nhất. Guard
mà ném lỗi thì *mở* cửa cho qua, trừ khi đăng ký của nó có `.catch`. Nên nó có,
và handler đó từ chối.

Thứ guard không làm: nó đọc chuỗi lệnh, không phân tích cú pháp shell. `$(...)`,
`eval`, `bash -c "..."`, `xargs rm`, `find -delete`, script có gọi `rm` bên
trong, đều lọt. Guard là tấm lưới. Muốn chặn cứng thì dùng luật quyền hạn
(permission rules). Mặc định **tắt**, bật bằng `guard (a)` trong `/sl-settings`,
lưu như bố cục.

Ý tưởng và hình dạng phần giữ lấy từ Blast Radius, do Claude Code DevRel tại
Anthropic viết, trong
[claude-code-playground](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods/blast-radius)
(Apache-2.0). Mã ở đây là của repo này, viết sau khi đọc mã của họ; xem
`ACKNOWLEDGEMENTS.md`. Vì sao nó nằm trong mod này chứ không đứng riêng: Blast
Radius vẽ báo cáo vào dải khi terminal quá hẹp cho một khung, mà README của họ
nói dải mỗi lúc chỉ thuộc về một mod. Mod này là mod đó. Ở trong thì không có gì
để tranh.

Ba test đứng thay engine bên dưới: Bash do một bộ ghi trả lời, tiến trình do một
script, các lần ngủ của vòng giữ chờ trên đồng hồ giả, nên mỗi `advance` là một
vòng lặp. Test một giữ `rm -rf build`, kiểm báo cáo và dòng ngân sách còn đó,
bấm từ chối rồi đọc lời từ chối. Test hai cho `ls` qua nguyên vẹn, rồi giữ
`cd sub && git push --force origin main`, kiểm phép đo chạy trong `sub` với
`main..origin/main`, bấm chạy và thấy Bash được gọi. Test ba tắt guard và thấy
`git reset --hard` đi thẳng.

## Cái gì nằm đâu

`/sl-settings` vẽ mỗi ô một hàng, gom thành ba nhóm Identity, Budget, và Tokens
and money. Hàng nào cũng cùng dạng: phím, tên, đang ở đâu, lúc này vẽ gì. Bấm
phím là ô dời tiếp: dòng 1, 2, 3, 4, tắt, rồi quay vòng. Mỗi ô một phím, không
có con trỏ để lạc. Dưới các ô là các công tắc, cùng dạng: `reset (t)` cho mốc
reset sau thanh `5h` và `7d`, `guard (a)` cho phần giữ nói ở trên, `cold gate (k)`
cho câu hỏi nói ở dưới, và `effort (e)`. Cuối khung có bản xem trước, cho thấy
dải sẽ vẽ ra sao. Dưới bảy mươi cột thì cột cuối biến mất, giống như thanh của
dải.

Bố cục lưu ở `$.store`, theo từng máy, giữ qua phiên.

Hai luật khung này theo:

- Ô đang **bật** mà không có dữ liệu thì không vẽ gì. Thanh trống dễ bị đọc
  thành "chưa tiêu gì", cũng là kiểu xanh-vì-có-chạy mà repo này gặp hoài ở chỗ
  khác.
- Dòng nào không có gì thì bỏ luôn, không chừa chỗ trống.

### cache

Cache của prompt sống một giờ tính từ yêu cầu gần nhất chạm vào nó. Yêu cầu đầu
tiên sau giờ đó phải đọc lại cả bản ghi hội thoại với giá chưa cache. Phiên 330k
token thì mất vài đô cho hai dòng tóm tắt. Nên ô `cache` đếm ngược một giờ từ
yêu cầu gần nhất của vòng chính, cái mà `turn.step` thấy đi và về:

```
 cache ▰▰▰▰▰ 1h00m     vừa gửi
 cache ▰▰▱▱▱ 15m       vàng khi còn dưới hai mươi phút
 cache ▰▱▱▱▱ 4m        đỏ khi còn dưới mười
 cache cold            giờ đã hết; yêu cầu kế tiếp trả tiền để làm ấm lại
```

Thanh vơi dần, năm nấc của phần giờ còn lại, làm tròn lên như hạn mức. Màu ở
đây là màu đồng hồ, xanh lá, vàng, đỏ, vì hết giờ *chính là* rắc rối, khác với
mốc reset chỉ là một ngày tháng. Yêu cầu của tác tử con (subagent) không khởi
động lại đồng hồ, vì chúng không dùng cache của bản ghi chính. Trước yêu cầu đầu
tiên không vẽ gì, chưa có cache thì đếm cái gì. Dòng hẹp thì mất thanh, còn
`cache 15m`. Đếm ngược là ý của johnnyvizz, từ
[session-band](https://github.com/JohnnyVizz/claude-kit/tree/main/plugins/session-band);
đếm giờ từ yêu cầu gần nhất là của Karan Bansal, từ cache-tax.

Một điều ô này không biết: phiên đang vượt mức dùng (usage overage) rớt xuống
cache năm phút, mà không có gì báo cho mod. Lúc đó ô báo ấm lâu hơn thực tế.

![Vòng sáu bước: yêu cầu đi, giờ đếm ngược, vàng rồi đỏ, cache cold, cổng chặn prompt đầu một lần, Enter gửi và làm ấm lại](docs/figures/vi/cache-hour.svg)

*Hình 4. Ô cache và cold gate trong một giờ. Vòng khép lại vì prompt được cho
qua chính là yêu cầu làm ấm cache trở lại.*

### cold gate

Ô báo `cache cold`. Bật cổng lên thì chữ đó tốn thêm một lần bấm phím:

```
 > fix the flaky test in band.test.ts                      ⏎

 sl-mod cold gate: the prompt cache has been cold for 23m, so this request
 re-reads about 142.0k tokens at the uncached price before it answers. Enter
 again sends it as it is; /clear starts a fresh window if this is a new task.

 ct ▰▰▰▱▱ 58%   cache cold · enter sends it   5h ▰▱▱▱▱ 9% ↻2h14m
 > fix the flaky test in band.test.ts                      ⏎  → sent
```

Prompt đầu tiên bạn gõ sau khi hết giờ bị chặn một lần, bản nháp còn nguyên
trong ô, Enter lần nữa là đi. Mỗi đợt nguội chỉ hỏi một lần, và một yêu cầu đi
qua là xoá câu hỏi. Con số là đầu vào của phản hồi gần nhất, cũng là thứ yêu cầu
kế phải đọc lại. Tính bằng token chứ không bằng đô, lý do ở mục sau.

Không bao giờ hỏi khi: lệnh gạch chéo (slash command), vì không phải yêu cầu tới
model; prompt gõ lúc một lượt đang chạy, vì nó rơi vào cache mà lượt đó đang giữ
ấm; kích hoạt theo lịch, tin từ phiên khác, hay prompt của chính một plugin, vì
không có ai ở bàn phím để gửi lại; và cửa sổ dưới 50k token, đọc lại chỉ tốn vài
xu. Cổng mà hỏng thì cho prompt qua, đúng mặc định của engine và đúng cho một
lời nhắc về tiền. Compaction trước cũng không giúp, vì chính yêu cầu compaction
đọc lại cùng bản ghi đó.

Hỏi một lần, mức sàn, và cho lệnh gạch chéo cùng prompt không người gõ đi qua là
của Karan Bansal, từ [cache-tax](https://github.com/karanb192/cache-tax). Cổng ở
đây viết lại, không có bảng giá, và tắt cho tới khi bạn bấm `k` trong
`/sl-settings`.

`ch` là tỷ lệ trúng cache (cache hit rate), chỉ hiện trong cùng ô khi dưới
**70%**. Trên mức đó nó cứ 98 tới 100%, không nói lên gì, mà dành một ô cố định
cho một hằng số là phí bề ngang. Nó cũng là số duy nhất ở đây kể chuyện đã qua:
lúc nó tụt thì tiền đã mất rồi. Nó cộng dồn cả phiên chứ không đọc từ phản hồi
gần nhất, nên cần một tín hiệu khử trùng: `session.measure` nêu `cost` trong
`changed` là cách engine báo "một phản hồi có giá vừa về".

### input và output đếm token, không đếm đô

Engine chỉ đưa cho mod đúng một con số tiền, `cost.usd`, tổng của phiên, không
tách đầu vào với đầu ra. Muốn đổi token ra đô thì phải nhét bảng giá vào file
này, mà bảng giá trong file là con số sai lặng lẽ ngay ngày giá đổi. Nên `i` và
`o` là token, còn `$` là tổng phiên.

Tổng trọn đời, tiền và token qua mọi phiên, nằm ngoài tầm với hẳn. Muốn có thì
hoặc quét bản ghi, chính việc mà mod này sinh ra để tránh, hoặc dùng `ccuc`, thứ
không phải máy nào cũng có.

### speed và turn

Hai ô này mặc định tắt, bật bằng `s` và `n` trong `/sl-settings`:

```
 ct ▰▰▰▰▱ 66%   cache ▰▰▰▰▰ 1h00m   84 tok/s   turn $ 0.25 38s
```

`speed` là tốc độ của yêu cầu gần nhất trong vòng chính, tính bằng token đầu ra
mỗi giây, đo từ mẩu đầu tiên tới lúc dừng. Khoảng đợi token đầu không tính, nên
khởi động chậm không bị đọc thành model chậm. Yêu cầu dưới 20 token hay dưới một
giây thì không chấm. `turn` là lượt vừa xong: giá là tổng phiên lúc kết thúc trừ
tổng lúc bắt đầu, vì engine chỉ đưa một con số tiền không tách; độ dài là
`durationMs` của chính engine. Yêu cầu và lượt của tác tử con không đụng vào hai
ô này. Cả hai ô là của johnnyvizz, từ
[session-band](https://github.com/JohnnyVizz/claude-kit/tree/main/plugins/session-band),
viết lại ở đây.

### agents

```
 ct ▰▰▰▰▱ 66%   cache ▰▰▰▰▰ 1h00m   2 agents running
```

Ô `agents` mặc định ở dòng hai, trống cho tới khi có tác tử con (subagent) chạy.
Có thì nó đếm số đang chạy, dòng hẹp hiện `ag 2`. `/sl-agents` là tab thứ ba,
mỗi tác tử con một hàng:

```
 Subagents this session · 1 running
 ● running  ✓ answered  ✗ failed, aborted or killed; …

 ✓ Explore           4 req · 112.0k tok · 1m48s         find clock tests
 ● general-purpose   2 req · 82.4k tok · 38s            write the migration
```

Sổ này dựng từ sự kiện của vòng tác tử con: `agent.spawn` mở hàng khi engine báo
nó bắt đầu, mỗi `turn.step` trong vòng đó cộng một yêu cầu và token của nó (đầu
vào chưa cache, đọc từ cache, ghi vào cache, và đầu ra), `turn.complete` đóng
hàng là đã trả lời hay thất bại. Vòng bị engine giết thì không có sự kiện hoàn
tất nào tới mod, nên khung đối chiếu các hàng còn mở với `$.agent.list()` lúc
vẽ. Giữ ba mươi hàng. Ý sổ này của johnnyvizz, từ
[savvy-progress](https://github.com/JohnnyVizz/claude-kit/tree/main/plugins/savvy-progress);
bảng của họ còn lên kế hoạch và báo cáo luồng việc, cái này thì không.

### version

`⌂ 0.1.2` là phiên bản của **dự án đang mở**, không phải của engine. Đọc theo
thứ tự: `package.json`, `.claude-plugin/plugin.json`, `pyproject.toml`,
`Cargo.toml`, rồi `git describe --tags`. Không thấy gì thì bỏ ô, vì `⌂ ?` còn
nói ít hơn là không nói.

`dotfiles/arch` không khai phiên bản, không có tag, nên không có ô. Đó là ý
muốn, và `/sl-debug` nói rõ rơi vào trường hợp nào.

Phiên bản lấy từ tag git thì thêm `+N` khi HEAD đã đi quá tag, vì lúc đó thứ
đang chạy không còn là thứ tag gọi tên. Lấy từ file thì không đánh dấu gì: trong
claude-powerline, `✓` là ký hiệu **git sạch**, mà ô git cách đó hai ô đã vẽ dấu
ấy rồi. (Phần version của chính claude-powerline hiện `hookData.version`, tức
phiên bản Claude Code, không có dấu tích.)

## Cài đặt

Repo này có `.claude-plugin/marketplace.json`, nên nó **là** marketplace của
chính nó. Máy nào cũng hai dòng này, không dính đường dẫn:

```bash
claude plugin marketplace add ducban/sl-mod
claude plugin install sl-mod@sl-mod
```

`"source": "."` trong manifest, vì plugin nằm ngay gốc repo. Cài ở scope
**user**, nhờ vậy nó dùng chung cả máy thay vì gắn với một dự án.

### Cập nhật

Máy đã cài rồi thì lấy bản mới bằng hai dòng. Dòng đầu clone lại marketplace,
dòng sau thay bản đã cài:

```bash
claude plugin marketplace update sl-mod
claude plugin update sl-mod
```

Nó in bản đã chuyển, kiểu `updated from 0.1.2 to 0.1.3`, rồi `Restart to apply
changes`. Câu cuối hiểu theo nghĩa đen: phiên đang mở vẫn chạy bản cũ cho tới
khi mở lại, nên cập nhật xong mà gõ `/sl-debug` trong phiên cũ thì vẫn thấy mã
cũ.

Có một lần thử đặt `CLAUDE_CODE_PLUGIN_DIRS` vào `.paths` của shell. Bỏ rồi: một
đường dẫn tuyệt đối trong file shell riêng từng máy là ba chuỗi đường dẫn trên
máy này, máy Mac và VPS, ba thứ chờ lỗi thời, trong khi mod này sinh ra để thôi
phụ thuộc vào dây nối cục bộ.

Repo này **công khai**, nên `marketplace add` clone qua HTTPS thường, không máy
nào cần đăng nhập GitHub. Đã kiểm hẳn hoi: tắt credential helper và git config
toàn cục, clone vẫn được. Quan trọng nhất là với VPS, không màn hình, nếu không
thì phải qua device flow hay token.

## Phát triển

Plugin đã cài chạy từ một **bản sao** mà Claude Code chép lúc cài. Sửa gì trong
thư mục làm việc này muốn tới phiên thì phải đi trọn vòng:

```bash
git push
claude plugin marketplace update sl-mod
claude plugin update sl-mod
# then /reload-plugins, or restart
```

Lúc đang viết mã thật thì bỏ hết vòng đó, nạp thẳng thư mục. Một cờ trên một
lệnh, không theo dõi gì:

```bash
claude --plugin-dir ~/Workspace/Projects/personal_works/sl-mod
```

Trước khi push, chạy ba thứ:

```bash
claude plugin validate .
claude plugin test .
tsc -p .
```

`validate` in `gating hook without .catch: ...` cho mấy hook nắm chuỗi. Mấy dòng
đó không phải nhiễu đâu. Một dòng trong số đó nằm trên màn hình từ commit đầu
tiên, trong khi một `$.process.run` không được che trong hook nắm chuỗi làm sập
ba phép dò, và lần nào cũng đọc lướt qua.

Hình trong `docs/figures/` do script vẽ bằng `figlib.mjs` của skill
`b3-figure-drawing`, không vẽ tay. Bản tiếng Việt nằm ở `docs/figures/vi/`. Mỗi
SVG mang cả hai bảng màu và đổi theo `prefers-color-scheme` của người đọc.

## Lệnh

| | |
|---|---|
| `/sl` | ẩn hay hiện dải |
| `/sl-settings` | hiện gì, ở dòng nào, mốc reset, và lựa chọn effort |
| `/sl-help` | chú giải: từng ô, cách đọc đồng hồ, các phím |
| `/sl-effort <level>` | đặt thẳng một mức, hoặc `off` để thôi ghi đè |
| `/sl-debug` | in những gì engine báo, kèm ghi chú |
| `/sl-agents` | các tác tử con phiên này đã chạy: đang chạy, đã trả lời, thất bại |

`/sl-help`, `/sl-settings` và `/sl-agents` là ba tab. `/sl-debug` in chữ.

## Dòng trạng thái mà mod này thay

Trước mod này có hai thứ từng ngồi chỗ đó, không phải một.

`reference/statusline-command.sh` là cái đầu: 92 dòng bash Ban tự viết, đọc
JSON của engine từ stdin bằng `jq`. Hình dạng của nó chính là hình dạng mod này
(dòng một `folder | model | Ctx:%`, dòng hai `5h` và `7d` kèm giờ reset và đếm
ngược), nên giữ lại đây chứ không vứt. Đó là bản duy nhất: không repo nào trên
hai máy theo dõi nó, và nó nằm không trong `~/.claude/` từ khi khối `statusLine`
bị gỡ. Giữ để lưu, không nối vào đâu: mod này không đọc nó.

Nó cũng cho thấy cái giá mà mod sinh ra để bỏ: mỗi lần vẽ lại là chạy `bash`,
rồi `jq` năm lần, cộng `awk` và `date` cho từng trường.

`claude-powerline` tới sau, gỡ khỏi `~/.claude/settings.json` ngày 06/10/2026,
nên giờ dải là dòng trạng thái duy nhất trong cửa sổ. Muốn đặt lại thì khối cũ
là:

```json
"statusLine": {
  "type": "command",
  "command": "claude-powerline --config=~/.claude/powerline-config.json",
  "padding": 0
},
```

## Hàng một dùng biểu tượng, hàng hai dùng chữ

Hàng một dùng biểu tượng Nerd Font. Chúng vẽ nhỏ hơn chữ bên cạnh một chút, và
mod không sửa được, vì mod không chọn font. Ký tự (glyph) nào JetBrains Mono
không có thì font dự phòng mà fontconfig tìm tới sẽ vẽ, theo số đo của font đó.

Đo bằng `fc-list :charset=<cp>`, kiểm lại được, không phải nghe nói:

| | trong JetBrains Mono | từ font dự phòng |
|---|---|---|
| biểu tượng | `⌂ ✓ ● ⇡ ▲ ▼ ·` và ``  (E0B0) | ``  ``  `` (Nerd Font PUA) |
| đồng hồ | `■ □ █ ░ ▓` | `▰ ▱` (đang dùng), `▮ ▯` (effort) |

Rút ra hai điều. Dấu ngăn powerline **có** trong JetBrains Mono, nên vẽ đúng cỡ;
nó chỉ bị thiếu, thành chuỗi rỗng, suốt bốn commit. Và cả hai cặp thanh đang
dùng đều là ký tự dự phòng: `██░░░` hay `■■□□□` là cặp thay cùng cỡ, mỗi cặp một
dòng, nhưng không đổi vì cặp hiện tại là thứ được yêu cầu.

Hàng hai dùng chữ: `ct`, `5h`, `7d`, và tên model cho cửa sổ theo model. Chữ vẽ
đúng cỡ hàng, mà hàng ngân sách là nửa phải đọc nhanh.

Mọi ký tự đặc biệt trong mã viết dạng escape `\u{...}`. Viết thẳng ký tự thì
từng mất trong một lần ghi file, và triệu chứng rất lặng: mọi biểu tượng thành
chuỗi rỗng, dấu ngăn powerline giữa hai ô không vẽ gì suốt bốn commit.
