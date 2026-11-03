# sl-mod

[English](README.md)

Dòng trạng thái (status line) cho Claude Code, vẽ vào dải (band) phía trên ô gõ,
dưới dạng một mod thay vì một lệnh `statusLine`.

Tên các ô và các công tắc (`cache`, `cold gate`, `guard`, `effort`, `reset`,
`speed`, `turn`, `agents`) giữ nguyên tiếng Anh suốt tài liệu, vì đó là chữ bạn
sẽ thấy trong `/sl-settings` và cần tra đúng.

## Vì sao

Cài đặt `statusLine` chạy một lệnh ngoài ở mỗi lần màn hình vẽ lại. Lệnh nó thay
thế, `claude-powerline`, tốn **khoảng 57 ms** một lần vẽ trên máy này, gần hết
là thời gian Node khởi động, rồi mới đọc 127 MB bản ghi hội thoại để cộng token.
Mod là một module engine nạp đúng một lần, nên mỗi lần vẽ lại chỉ là một lời gọi
hàm, còn việc đọc tốn kém dời sang bộ hẹn giờ (timer), không nằm trên đường vẽ.

![Lệnh statusLine chạy một tiến trình và đọc bản ghi ở mỗi lần vẽ; mod nạp một lần và đọc bộ nhớ](docs/figures/vi/statusline-vs-mod.svg)

*Hình 1. Một lần vẽ lại tốn gì dưới lệnh `statusLine` và dưới mod này. Số 57 ms
và 127 MB đo trên máy này.*

Cái phải đánh đổi: phía dưới ô gõ không có chỗ để vẽ, nên dải nằm **phía trên**.
Hai dòng đó đi theo ô gõ chứ không đứng yên như chỗ `statusLine` từng đặt.

Những gì mod giữ lại từ `claude-powerline`, và mọi ý tưởng lấy từ mod khác sau
này, đều ghi trong `ACKNOWLEDGEMENTS.md`, mỗi thứ một dòng kèm tên người và giấy
phép.

## Mod nối dây thế nào

Mọi thứ dải vẽ ra đều đã nằm sẵn trong bộ nhớ trước khi lần vẽ lại hỏi tới.
Engine phát một sự kiện cho mỗi yêu cầu, mỗi lần đo, mỗi lần compaction và mỗi
tác tử con (subagent), và một hook ghi con số xuống ngay khi sự kiện tới. Mod có
một bộ hẹn giờ của riêng nó, mười giây một nhịp, để soát lại đồng hồ ngữ cảnh.
Thêm một lần gọi mạng ba phút một, chia chung cho mọi phiên trên cùng máy, để
lấy các cửa sổ hạn mức (quota) mà engine không đưa. Chỉ bố cục được lưu, ở
`$.store`, nên nó sống qua phiên.

![Ba tầng: sự kiện engine đưa cho mod, trạng thái mod giữ, và dải cùng các khung mod vẽ](docs/figures/vi/wiring.svg)

*Hình 2. Các sự kiện mod lắng nghe, mod giữ lại gì từ đó, và vẽ ra gì. Đường
đứt là chỗ một module đi kèm có thể đứng chắn trước mod trên máy có quản trị;
mục compaction nói rõ mất gì ở đó.*

Phần còn lại của tài liệu là chi tiết: mỗi ô đọc gì, không biết được gì, và đã
hỏng ở đâu trên đường đi.

## Dải hiện gì

```
  arch     Opus 5 ▮▮▯▯▯ (M)    main ✓   ⌂ 0.1.2
 ct ▰▰▰▰▱ 66%   5h ▰▱▱▱▱ 9% ↻2h14m   7d ▰▰▱▱▱ 39% ↻3d15h   fable ▰▰▱▱▱ 26%
```

Tối đa bốn dòng; ô nào nằm dòng nào thì chỉnh trong `/sl-settings`. Mặc định
dòng một là danh tính, dòng hai là ngân sách. Không vẽ gì dưới ô gõ: engine giữ
dòng gợi ý của riêng nó. Mỗi thanh là năm nấc 20%, làm tròn **lên**, nên 19%
hiện một nấc chứ không trống. Hạn mức không bao giờ được đọc thấp hơn thực tế.

Thanh `5h` mang theo `↻2h14m`: còn bao lâu tới lúc cửa sổ reset, phút làm tròn
lên, và `↻now` khi mốc đó đã qua mà engine chưa gửi mốc kế tiếp. Mốc mới tới
cùng lần đọc sau, không phải đúng giờ chẵn. Thanh `7d` mỗi phút đổi một lần giữa
đếm ngược `↻3d15h` và ngày nó rơi vào, `↻Oct 6 11:00pm` theo múi giờ của
terminal: tuần tính bằng ngày, và ngày là thứ bạn ghi vào lịch. Cả hai lần đọc
đều mang mốc reset (`resetsAt` từ engine, `resets_at` từ endpoint), nên mốc và
phần trăm luôn lấy từ cùng một lần đọc. Phím `reset` trong `/sl-settings` tắt
cả hai; lúc đang bật, dải tự vẽ lại mỗi phút, vì giữa hai sự kiện không có gì
khác vẽ nó.

Một lần đọc chia chung do phiên chạy mod cũ hơn ghi ra thì không mang mốc reset.
Ngày 22/10/2026, một VPS chạy 0.1.6 và 0.1.4 cạnh nhau chỉ vẽ mốc khi bản mới
hơn là bên vừa gọi mạng. Cửa sổ nào không nói thì nay lấy mốc từ cửa sổ cùng kỳ
của engine, vốn luôn có; tuần theo mô hình không có bản sống nào tương ứng nên
giữ nguyên như nhận được. Cập nhật mọi phiên trên máy là hết chuyện.

## Terminal hẹp, và giao diện màu

Dòng nào terminal không đủ chỗ thì vẽ không có thanh:

```
 ct 14%   5h 8% ↻2h08m   7d 8% ↻5d20h   fable 1%
```

Cùng số liệu trong nửa bề ngang. Quyết định theo từng dòng, dựa vào `bodyColumns`
mà bề mặt đưa cho dải, nên một dòng chật không kéo các dòng khác mất thanh theo,
và dòng nào vừa thì giữ thanh. Trên dòng hẹp, ô `7d` chỉ giữ đếm ngược, mặt
ngắn hơn trong hai mặt của nó.

Hai bảng màu: Tokyo Night Moon cho nền tối, là màu dòng trạng thái cũ từng dùng,
và Tokyo Night Day cho nền sáng. Dải tự tô nền, nên trước đây trên nền sáng vẫn
đọc được, một thanh tối trên trang sáng, nhưng trông như dán lên. Màu nền đọc từ
dòng `/config` lúc khởi động và đọc lại ở `config.set` khi đổi, nên đổi giao
diện là dải vẽ lại ngay, không cần mở phiên mới. Các nấc nền của Moon từng sát
màu nền terminal quá: ngày 22/10/2026 có người không phân biệt nổi ô với hàng
phía sau, nên nay mỗi nấc lên một bậc trong bảng màu.

Mốc reset nằm trong ô của thanh nhưng không ăn theo màu thanh. Nó xanh lơ khi
sắp tới (trong một phần năm cửa sổ: giờ cuối của 5h, hơn một ngày cuối của 7d),
xanh dương ở giữa, và màu thường khi còn xa. Không bao giờ xanh lá, vàng hay đỏ,
vì ba màu đó là của hạn mức. Một đếm ngược đỏ cạnh thanh xanh lá sẽ bị đọc
thành hạn mức đang có chuyện.

Dòng hai đi qua mọi cửa sổ trả về, chứ không gọi đích danh hai cái. Chuyện này
quan trọng: engine đưa cho mod `five_hour` và `seven_day` và bỏ tuần theo mô
hình, tức dòng `Current week (Fable)` trong `/usage`. Dữ liệu cho status line
cũng bị lọc mất dòng đó.

`$.session.authorize()` đi vòng được. Nó trả một tay cầm mờ cho chính chứng thực
Anthropic của phiên, và `$.http.fetch(url, { auth: handle })` tiêu tay cầm đó
với một host chính chủ. Chứng thực không bao giờ tới tay mod, nghĩa là mod cũng
không bao giờ làm mới nó, nên chuyện xoay token có thể làm bạn mất phiên Claude
Code không dính vào đây. Không phải cài gì, trên máy nào cũng vậy.

Một lần đọc cho mỗi máy, không phải mỗi phiên. Mỗi phiên đang mở chạy một bản mod
riêng với bộ hẹn giờ ba phút riêng, nên bốn phiên là bốn lần gọi một kỳ trên
cùng một token, cộng một lần ở mỗi lần mở phiên, mà giới hạn của endpoint tính
theo token: ngày 11/10/2026 một máy Mac bị 429 hàng giờ trong khi cùng tài khoản
từ máy khác vẫn 200. Lần đọc nay nằm ở `$.store`, nơi mọi phiên trên máy dùng
chung: ai thấy nó cũ hơn ba phút thì gọi rồi ghi lại, những phiên còn lại nhận
theo, và thời gian lùi sau một 429 cũng chia chung như vậy. `/sl-debug` in
`source=` để bạn thấy lần đọc đến từ đâu.

Lần đọc cũ hơn mười lăm phút thì không vẽ, thay bằng hai cửa sổ sống của engine.
Hai thanh đúng hơn ba thanh ôm một con số cũ.

## Compaction

`session.measure` **không** phát khi compaction, nên đồng hồ ngữ cảnh từng giữ
con số trước đó: 38% trên một phiên vừa dọn trống cửa sổ. Đúng lúc đo, và đó là
kiểu sai tệ nhất, vì nó trông như đang đúng.

Hai hook lo việc này. `session.compact` lấy số từ chính kết quả compaction
(`tokensAfter`), là nguồn tốt hơn: hỏi lại không giúp gì, vì `context.tokens` là
*"số token đầu vào mà phản hồi gần nhất được trả lời trên đó"* và ngay sau
compaction chưa có phản hồi nào. `classic.PostCompact` là lưới dự phòng cho lần
compaction không báo số.

Lưới dự phòng lúc đầu đọc `context.percent` và chỉ nhận khi số đã đi xuống, với
giả định là lần đọc chưa bắt kịp vẫn giữ số trước compaction. Không phải vậy:
engine **bỏ hẳn trường đó**, nên ngay sau compaction `usage.context` chỉ còn
`{ window }` cho tới khi phản hồi kế tiếp về. Ngày 19/10/2026 một phiên đọc
`/context` ra 9% trong khi dải giữ 20% từ trước compaction. Lưới dự phòng đã
hỏi, không nhận được `percent`, và giữ nguyên cái nó có. Một phản hồi sau, engine
báo 10% và đồng hồ tự bắt kịp, nên lỗ hổng nằm đúng ở khoảng giữa compaction và
phản hồi kế tiếp, cũng là đúng lúc bạn nhìn đồng hồ.

Cả hai hook nay lùi về `$.session.usage({ breakdown: 'summary' })` và lấy
`breakdown.percentage`: mức đầy như `/context` ước tính, tính tại chỗ không gửi
yêu cầu nào, và là con số duy nhất tồn tại trong khoảng trống đó. Nó đo theo
cửa sổ compaction chứ không theo cửa sổ của mô hình, nên có thể cao hơn `percent`
một điểm trên cùng bản ghi, y như `/context`. Phép kiểm "đã đi xuống" giữ lại
làm đường cuối khi không có breakdown.

`/sl-debug` nay in `band ct:` cạnh `context:` thô của engine. Đó là con số của
chính đồng hồ, hook nào ghi và ghi cách đây bao lâu, nên "engine ngừng báo" và
"dải ngừng nghe" không còn trông giống nhau. Nó in cả con số của breakdown.

Rồi ngày 26/10/2026 cả hai hook không chạy. Trên máy có cài đặt quản trị, hoặc
tài khoản Team hay Enterprise, Claude Code 2.1.310 đặt module đi kèm
`cc-plugin-sec-default@builtin` ở ngoài cùng, và module đó không chuyển tiếp
`session.compact` lẫn `classic.PostCompact`: engine ghi *"sl-mod: its
session.compact hook was skipped. \"cc-plugin-sec-default\" runs first and sent
the event on past it"* và dải không bao giờ nghe thấy. Một lần `/compact` đưa
phiên từ 202k token xuống 15k mà đồng hồ giữ 20% trong khi `/context` nói 6%.
(Cùng module đó giữ cả `classic.SessionStart` và `classic.PostToolUse`, chính
là thông báo mở đầu mọi phiên trên máy như vậy; hai cái đó vô hại ở đây, vì
`session.start` lấy các số đo đầu tiên.)

Nên đồng hồ nay tự soát tiền đề của mình, theo bộ hẹn giờ của riêng mod, thứ
không có gì đứng chắn trước. Mười giây một lần nó đọc mức dùng thô, một lời gọi
tại chỗ. Engine bỏ `context.percent` ngay khi compaction xảy ra và không trả lại
cho tới phản hồi kế tiếp, nên một đồng hồ đang giữ số trong khi lần đọc không có
số là đã bỏ lỡ một compaction, và nó lấy breakdown y như hai hook kia sẽ làm.
Lúc khác nhịp này không làm gì: không ước, không vẽ lại. `/sl-debug` hiện đồng
hồ ghi theo lối này là `from=tick breakdown`. Chỗ sửa thuộc về Claude Code là
module đi kèm phải gọi `next(e)`; mod này chỉ thôi phụ thuộc vào nó.

Nhịp đó vẫn có thể trễ mười giây, mà yêu cầu bạn gửi ngay sau compaction lại là
lúc bạn nhìn đồng hồ. Nên `turn.step`, sự kiện duy nhất mọi mod đều được đưa,
cũng được đọc cho việc này: mỗi yêu cầu của vòng chính nói nó mang bao nhiêu tin
nhắn (`messageCount`), và yêu cầu nào mang chưa tới một nửa yêu cầu trước là
yêu cầu đầu tiên sau compaction, vì bản ghi đã bị viết lại bên dưới. Đồng hồ khi
đó lấy breakdown theo cùng cách, ngay trên yêu cầu đó chứ không đợi nhịp kế;
`/sl-debug` hiện là `from=turn.step breakdown`. Vòng của tác tử con mang số
nhỏ riêng nên được bỏ qua, và `/clear` cũng làm số giảm một nửa, rơi vào cửa sổ
vừa dọn trống, là đúng. Phép thử "giảm một nửa" là của Karan Bansal, từ
[cache-tax](https://github.com/karanb192/cache-tax); xem `ACKNOWLEDGEMENTS.md`.

Đường `session.compact` không có test: bộ thử không có bản ghi, nên `e.messages`
không phải danh sách và mọi hook trong chuỗi bị bỏ qua. Lưới dự phòng được thử
với đúng hình dạng thật của lần đọc sau compaction: không `percent`, breakdown
chỉ khi hỏi, và phép kiểm trên một `percent` có mặt. Bộ hẹn giờ thử riêng: lần
đọc mất `percent` trong khi đồng hồ đang giữ số, nhịp lấy breakdown, bám theo
nó khi khoảng trống còn, và rút lui khi số đẩy tới trở lại. Test `turn.step`
dẫn luồng từ một đáy giả: số tăng dần, số nhỏ của tác tử con, rồi vòng chính
rớt xuống một phần ba và đồng hồ lấy breakdown.

## Trạng thái

Phiên bản 0.1.17, cài từ chính marketplace của repo này ở scope **user**, nên
vẽ trong mọi phiên trên máy. Cả sáu lệnh chạy. Ba mươi hai test qua dưới
`claude plugin test`, `tsc -p .` sạch và `claude plugin validate` qua.

Mỗi con số lấy định kỳ đều kèm một ghi chú nói vì sao nó trống, và `/sl-debug`
in ghi chú đó. Một ô trống trông y hệt nhau dù phép dò trả lời "không có nhánh"
hay ném lỗi trên đường hỏi, và sự im lặng đó từng tốn thời gian ở đây.

## Help và settings là các tab

Không phải dựng gì cho việc này. Engine không vẽ tiêu đề cho một khung (pane)
đứng một mình, và vẽ dải tab ngay khi khung thứ hai mở ra. `PaneOpenArgs.title`
nói thẳng: "The pane's tab while more than one pane is open (with one, no title
is drawn)", và sự kiện vẽ `Pane`: "one shown, the rest tabs".

Nên `/sl-help`, `/sl-settings` và `/sl-agents` mỗi lệnh mở cả ba khung rồi đưa
khung của mình lên. `focus: true` vừa đưa lên vừa lấy tiêu điểm, vì thế khung
được gọi mở sau cùng. Bấm vào tab kia thì nó hiện, hoặc Tab tới rồi Enter.

`/sl-debug` vẫn là chữ thuần. Nó là bản đổ ra để chọn và dán đi chỗ khác, mà
thân một khung thì không chép ra được.

## Dòng gợi ý, và vì sao không vẽ gì ở đó nữa

Đã thử hai cách và không cách nào chạy.

Một cây `flexDirection: 'column'` ở `PromptHint` **không** cho hai hàng. Cây
mang cả các nút điều khiển lẫn chuỗi `hint` của engine ra thành một dòng bị gập,
chữ của engine gãy ngang:

```
⏵⏵ auto mode on · effort: [ ▲ ] [ ▼ ] · [ help ]
                    (shift+tab to cycle)
```

Và `4`, `5`, `0` không bao giờ bắn ở đó; chuyện này đo được chứ không đoán.
Kiểu dữ liệu nói một chữ số gõ từ ô trống bấm một Button của dải và chỉ của dải,
và đúng là vậy.

Nên chỗ đó để yên. Các nút điều khiển dời vào `/sl-settings`, nơi khung giữ bàn
phím và phím tắt của Button chạy.

## Effort là chọn, không phải đẩy lên xuống

Nút điều khiển tương đối cần một mốc xuất phát, mà mốc đó là đoán. `turn.step`
chỉ mang `effort` khi yêu cầu nêu tên một mức, *"cài đặt của phiên hoặc mặc định
của mô hình, vắng với mô hình không có effort"*, và trong phiên này nó chưa bao
giờ mang. Nên một lần bấm "tăng" từ mốc chưa biết tính ra `medium + 1` và vẽ
`(H)` cho một phiên không hề ở high.

Hai chỗ sửa, và cần cả hai:

- **Mức nay được đọc.** Các hook classic mang `effort.level`, *"sau mọi lần hạ
  ngầm"*, ở bất cứ gì phát trong ngữ cảnh dùng công cụ. `classic.PostToolUse`
  lo lượt có dùng công cụ, `classic.Stop` lo lượt không dùng. Mỗi hook đọc một
  chuỗi rồi chuyển sự kiện đi thẳng.
- **Nút điều khiển là danh sách, không phải nút đẩy.** `/sl-settings` liệt kê
  `session`, `L`, `M`, `H`, `X`, `✦` và `e` bước qua từng mức. `session` đứng
  đầu và nghĩa là mod này không có ý kiến: `turn.step` cho mọi yêu cầu qua
  nguyên vẹn và dải báo đúng cái phiên đang làm. Một danh sách để chọn thì không
  thể sai về chỗ nó xuất phát.

Khác với bố cục, lựa chọn effort **không** được lưu. Bố cục là sở thích sống qua
phiên; effort của những yêu cầu phiên này gửi thì không.

## Guard

Dải trước giờ chỉ là thứ để đọc. Đây là thứ đầu tiên trên đó biết hỏi.

Bốn lệnh shell vứt đi thứ mà cả git lẫn đĩa đều không trả lại: `rm -rf`,
`git reset --hard`, `git clean`, và force push. Khi guard bật, một lời gọi Bash
cho một trong bốn lệnh đó bị giữ lại trước khi chạy, mod đo thứ nó sẽ phá, và
bản báo cáo chiếm chỗ dòng một của dải:

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

![Năm bước: lời gọi Bash, giữ lại, đo, báo cáo trong dải, và Claude đọc câu trả lời](docs/figures/vi/guard.svg)

*Hình 3. Một lệnh Bash nguy hiểm đi qua những gì, từ lúc Claude gọi tới lúc
shell chạy, hoặc không chạy.*

`1` chạy đúng như viết. `2`, Esc trên lượt đó, mười phút im lặng, hay chính
guard bị lỗi đều từ chối, và Claude đọc được vì sao, *"the user pressed refuse.
It would have: delete 1,204 files"*, nên nó không thử lại đúng dòng đó. `refuse`
giữ tiêu điểm, nên Enter là từ chối. Dòng ngân sách vẫn nằm dưới báo cáo; dòng
danh tính là dòng bạn ít cần nhất lúc ấy. Lệnh đang bị giữ vẫn được vẽ kể cả
khi dải đã ẩn bằng `/sl`: đó là một câu hỏi, và im lặng sẽ thành câu trả lời.

Mỗi lệnh đo gì:

| Lệnh | Hiện |
|---|---|
| `rm -r`, `rm -f`, `rm -rf` | số file và dung lượng sẽ xoá; glob và `~` đã mở rộng |
| `git reset --hard` | các file có thay đổi chưa commit, và `git diff --shortstat` |
| `git clean` | thứ `git clean -n` với cùng cờ sẽ xoá |
| `git push --force`, `-f`, `--force-with-lease`, `+ref` | các commit trên nhánh remote mà lần push sẽ làm mất, tính tới lần fetch gần nhất |

Một `cd dir &&` hay `git -C dir` đứng trước trên dòng lệnh dời chỗ đo. Đường dẫn
đưa cho `bash`, `find`, `du` và `git` dưới dạng **tham số**, không bao giờ là mã
nguồn, nên không có gì trong tên file được chạy. Đường dẫn tương đối được thêm
`./` phía trước, nên `find` không bao giờ đọc một cái tên kiểu `-delete` thành
hành động.

Giữ lại bằng cách nào: một hook có mười giây của riêng nó, không đủ để đợi một
người, nhưng thời gian bên trong một lời gọi `$` không tính vào đó. Nên phần giữ
là một vòng ngủ từng phần tư giây qua `$.process.run(['sleep'])` cho tới khi
`onPress` của một nút đặt quyết định, `next.signal` của lượt huỷ, hoặc hết mười
phút. Mỗi lúc chỉ giữ một lệnh; lời gọi nguy hiểm thứ hai đợi lời gọi thứ nhất.
Guard mà ném lỗi thì *mở* cửa cho qua, trừ khi đăng ký của nó có `.catch`, nên
nó có, và handler đó từ chối.

Thứ nó không làm: nó đọc chuỗi lệnh và không phân tích cú pháp shell. `$(...)`,
`eval`, `bash -c "..."`, `xargs rm`, `find -delete`, và script có gọi `rm` đều
không bị bắt. Nó là một tấm lưới. Chặn cứng thì thuộc về luật quyền hạn. Mặc
định **tắt**, bật bằng `guard (a)` trong `/sl-settings`, lưu như bố cục.

Ý tưởng, và hình dạng của phần giữ, là của Blast Radius, do Claude Code DevRel
tại Anthropic viết, trong
[claude-code-playground](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods/blast-radius)
(Apache-2.0). Mã ở đây là của repo này, viết sau khi đọc của họ; xem
`ACKNOWLEDGEMENTS.md`. Lý do nó nằm trong mod này chứ không đứng cạnh: Blast
Radius vẽ báo cáo vào dải khi terminal quá hẹp cho một khung, và README của họ
nói dải mỗi lúc chỉ thuộc về một mod. Mod này là mod đó. Ở trong, không có gì
để tranh.

Ba test đứng thay engine bên dưới: Bash do một bộ ghi trả lời, tiến trình do
một script, các lần ngủ của vòng giữ do chờ trên đồng hồ giả, nên mỗi `advance`
là một vòng lặp. Một test giữ `rm -rf build`, kiểm báo cáo và việc dòng ngân
sách còn đó, bấm từ chối và đọc lời từ chối. Một test cho `ls` qua nguyên vẹn,
rồi giữ `cd sub && git push --force origin main`, kiểm phép đo chạy trong `sub`
với `main..origin/main`, bấm chạy và thấy Bash được gọi. Một test tắt guard và
thấy `git reset --hard` đi thẳng.

## Cái gì nằm đâu

`/sl-settings` vẽ mỗi ô một hàng, gom thành Identity, Budget, và Tokens and
money, hàng nào cũng cùng một dạng: phím, tên, đang ở đâu, và lúc này vẽ ra gì.
Bấm phím thì ô dời tiếp: dòng 1, 2, 3, 4, tắt, rồi quay vòng. Mỗi ô một phím,
không có con trỏ để lạc. Dưới các ô, cùng dạng, là các công tắc: `reset (t)`
cho mốc reset sau thanh `5h` và `7d`, `guard (a)` cho phần giữ ở trên,
`cold gate (k)` cho câu hỏi ở dưới, và `effort (e)`. Một khung xem trước ở
cuối cho thấy dải sẽ vẽ ra sao. Dưới bảy mươi cột, cột cuối biến mất, như thanh
của dải.

Bố cục lưu ở `$.store`, nên theo từng máy và sống qua phiên.

Hai luật khung này tuân theo:

- Ô đang **bật** mà thiếu dữ liệu thì không vẽ gì. Một thanh trống bị đọc thành
  "chưa tiêu gì", cũng là kiểu đọc xanh-vì-đã-thử mà repo này cứ gặp ở chỗ khác.
- Dòng không có gì thì bỏ, không chừa khoảng trống.

### cache

Cache của prompt sống một giờ kể từ yêu cầu gần nhất chạm vào nó, và yêu cầu
đầu tiên sau giờ đó đọc lại cả bản ghi hội thoại với giá chưa cache: trên một
phiên 330k token là vài đô cho hai dòng tóm tắt. Nên ô `cache` đếm ngược một
giờ từ yêu cầu gần nhất của vòng chính, thứ `turn.step` thấy đi và về:

```
 cache ▰▰▰▰▰ 1h00m     vừa gửi
 cache ▰▰▱▱▱ 15m       vàng khi còn dưới hai mươi phút
 cache ▰▱▱▱▱ 4m        đỏ khi còn dưới mười
 cache cold            giờ đã hết; yêu cầu kế tiếp trả tiền để làm ấm lại
```

Thanh vơi dần, năm nấc của phần giờ còn lại, làm tròn lên như hạn mức. Màu ở đây
là màu của đồng hồ, xanh lá, vàng, đỏ, vì hết giờ *chính là* rắc rối, khác với
mốc reset, chỉ là một ngày tháng. Yêu cầu của tác tử con không khởi động lại
nó: chúng không phải cache của bản ghi chính. Trước yêu cầu đầu tiên không vẽ
gì, vì chưa có cache để đếm. Trên dòng hẹp, thanh mất và `cache 15m` ở lại. Đếm
ngược là ý của johnnyvizz, từ
[session-band](https://github.com/JohnnyVizz/claude-kit/tree/main/plugins/session-band);
đếm giờ từ yêu cầu gần nhất là của Karan Bansal, từ cache-tax.

Một thứ ô này không biết được: phiên đang vượt mức dùng (usage overage) rớt
xuống cache năm phút, và không có gì báo cho mod. Khi đó ô đọc là ấm lâu hơn
thực tế.

![Vòng sáu bước: yêu cầu đi, giờ đếm ngược, vàng rồi đỏ, cache cold, cổng chặn prompt đầu một lần, Enter gửi và làm ấm lại](docs/figures/vi/cache-hour.svg)

*Hình 4. Ô cache và cold gate trong một giờ. Vòng khép lại vì prompt được cho
qua chính là yêu cầu làm ấm cache trở lại.*

### cold gate

Ô nói `cache cold`. Khi cổng bật, chữ đó tốn thêm một lần bấm phím:

```
 > fix the flaky test in band.test.ts                      ⏎

 sl-mod cold gate: the prompt cache has been cold for 23m, so this request
 re-reads about 142.0k tokens at the uncached price before it answers. Enter
 again sends it as it is; /clear starts a fresh window if this is a new task.

 ct ▰▰▰▱▱ 58%   cache cold · enter sends it   5h ▰▱▱▱▱ 9% ↻2h14m
 > fix the flaky test in band.test.ts                      ⏎  → sent
```

Prompt đầu tiên gõ sau khi hết giờ bị chặn một lần, bản nháp còn nguyên trong ô,
và lần Enter kế gửi nó đi. Trong một đợt nguội không hỏi hai lần, và một yêu
cầu đi qua là xoá câu hỏi. Con số là đầu vào của phản hồi gần nhất, cũng là thứ
yêu cầu kế tiếp phải đọc lại; nó tính bằng token chứ không bằng đô, vì lý do
mục sau nói.

Không bao giờ hỏi với: lệnh gạch chéo, vốn không phải yêu cầu tới mô hình;
prompt gõ khi một lượt đang chạy, vì nó rơi vào cache mà lượt đó đang giữ ấm;
kích hoạt theo lịch, tin từ phiên ngang hàng hay prompt của chính một plugin,
vì không có ai ở bàn phím để gửi lại; và cửa sổ dưới 50k token, chỗ đọc lại chỉ
tốn vài xu. Cổng mà hỏng thì cho prompt qua, là mặc định của engine và là lựa
chọn đúng cho một lời nhắc về tiền. Compaction trước cũng không giúp: chính yêu
cầu compaction đọc lại cùng bản ghi đó.

Hỏi một lần, mức sàn, và cho lệnh gạch chéo cùng prompt không người gõ đi qua
là của Karan Bansal, từ [cache-tax](https://github.com/karanb192/cache-tax);
cổng ở đây viết lại không có bảng giá, và tắt cho tới khi `k` trong
`/sl-settings` bật nó.

`ch`, tỷ lệ trúng cache, chỉ vào cùng ô khi dưới **70%**. Trên mức đó nó đọc
98–100% và không nói gì, mà một ô cố định cho một hằng số là phí bề ngang. Nó
cũng là con số duy nhất ở đây kể chuyện đã qua: lúc nó tụt thì tiền đã mất. Nó
cộng dồn cả phiên chứ không đọc từ phản hồi gần nhất, nên cần một tín hiệu khử
trùng: `session.measure` nêu `cost` trong `changed`, là cách engine nói "một
phản hồi có giá vừa về".

### input và output là token, không phải đô

Engine đưa cho mod đúng một con số tiền: tổng của phiên, `cost.usd`, không tách
đầu vào với đầu ra. Đổi token ra đô là phải có bảng giá trong file này, mà bảng
giá trong file là con số sai lặng lẽ đúng ngày giá đổi. Nên `i` và `o` là số
token, còn `$` là tổng phiên.

Tổng trọn đời, tiền và token qua mọi phiên chứ không riêng phiên này, nằm ngoài
tầm với hẳn. Nó cần hoặc là lần quét bản ghi mà mod này sinh ra để tránh, hoặc
là `ccuc`, thứ không có trên mọi máy.

### speed và turn

Hai ô mặc định tắt, `s` và `n` trong `/sl-settings` bật chúng:

```
 ct ▰▰▰▰▱ 66%   cache ▰▰▰▰▰ 1h00m   84 tok/s   turn $ 0.25 38s
```

`speed` là yêu cầu gần nhất của vòng chính tính bằng token đầu ra mỗi giây, đo từ
mẩu đầu tiên tới lúc dừng, nên khoảng đợi token đầu không tính vào và khởi động
chậm không bị đọc thành mô hình chậm. Yêu cầu dưới 20 token hay dưới một giây
không được chấm. `turn` là lượt vừa xong gần nhất: giá là tổng phiên lúc kết
thúc trừ tổng lúc bắt đầu, vì engine chỉ đưa mod một con số tiền và không tách,
còn độ dài là `durationMs` của chính engine. Yêu cầu và lượt của tác tử con
không chạm vào cả hai. Cả hai ô đều là của johnnyvizz, từ
[session-band](https://github.com/JohnnyVizz/claude-kit/tree/main/plugins/session-band),
viết lại ở đây.

### agents

```
 ct ▰▰▰▰▱ 66%   cache ▰▰▰▰▰ 1h00m   2 agents running
```

Ô `agents` mặc định ở dòng hai và trống cho tới khi có tác tử con chạy; rồi nó
đếm số đang chạy, và `ag 2` trên dòng hẹp. `/sl-agents` là tab thứ ba, mỗi tác
tử con một hàng:

```
 Subagents this session · 1 running
 ● running  ✓ answered  ✗ failed, aborted or killed; …

 ✓ Explore           4 req · 112.0k tok · 1m48s         find clock tests
 ● general-purpose   2 req · 82.4k tok · 38s            write the migration
```

Sổ này dựng từ các sự kiện vòng của một tác tử con phát ra: `agent.spawn` mở
một hàng khi engine nói nó đã bắt đầu, mỗi `turn.step` trong vòng đó cộng một
yêu cầu cùng token của nó (đầu vào chưa cache, đọc từ cache và ghi vào cache,
cùng đầu ra), và `turn.complete` đóng hàng là đã trả lời hay thất bại. Vòng bị
engine giết thì không phát sự kiện hoàn tất nào mod nghe được, nên khung đối
chiếu các hàng còn mở với `$.agent.list()` lúc vẽ. Giữ ba mươi hàng. Ý tưởng
sổ này là của johnnyvizz, từ
[savvy-progress](https://github.com/JohnnyVizz/claude-kit/tree/main/plugins/savvy-progress);
bảng của họ còn lên kế hoạch và báo cáo một luồng việc, cái này thì không.

### version

`⌂ 0.1.2` là phiên bản của **dự án đang mở**, không phải của engine, đọc theo
thứ tự: `package.json`, `.claude-plugin/plugin.json`, `pyproject.toml`,
`Cargo.toml`, rồi `git describe --tags`. Không thấy gì thì không có ô, vì `⌂ ?`
nói còn ít hơn là không nói.

`dotfiles/arch` không khai phiên bản và không có tag, nên không vẽ ô. Đó là câu
trả lời đúng ý, và `/sl-debug` nói rõ là trường hợp nào.

Phiên bản lấy từ tag git được thêm `+N` khi HEAD đã đi quá tag, vì khi đó thứ
đang chạy không còn là thứ tag gọi tên. Phiên bản lấy từ file thì không đánh
dấu: trong claude-powerline, `✓` là ký hiệu **git sạch**, và ô git cách đó hai ô
đã vẽ dấu ấy. (Phần phiên bản của chính nó hiện `hookData.version`, tức phiên
bản Claude Code, không có dấu tích nào.)

## Cài đặt

Repo này mang `.claude-plugin/marketplace.json`, nên nó **là** marketplace của
chính nó. Hai dòng trên máy nào cũng được, không có đường dẫn nào:

```bash
claude plugin marketplace add ducban/sl-mod
claude plugin install sl-mod@sl-mod
```

`"source": "."` trong manifest đó, vì plugin là gốc repo. Nó cài ở scope
**user**, chính là thứ làm nó dùng chung cả máy thay vì gắn với một dự án.

### Cập nhật

Máy đã có rồi thì lấy bản mới bằng hai dòng. Dòng đầu clone lại marketplace,
dòng sau thay bản đã cài:

```bash
claude plugin marketplace update sl-mod
claude plugin update sl-mod
```

Nó in phiên bản đã chuyển, ví dụ `updated from 0.1.2 to 0.1.3`, rồi `Restart to
apply changes`. Câu cuối là nghĩa đen: phiên đang mở vẫn chạy bản cũ cho tới
khi mở lại, nên sau khi cập nhật, `/sl-debug` trong phiên cũ vẫn tả mã cũ.

Một lần thử trước đó đặt `CLAUDE_CODE_PLUGIN_DIRS` vào `.paths` của shell. Đã
bỏ: một đường dẫn tuyệt đối trong file shell theo từng máy là ba chuỗi đường dẫn
trên máy này, máy Mac và VPS, ba thứ để lỗi thời, mà mục đích của mod là thôi
phụ thuộc vào dây nối cục bộ.

Repo này **công khai**, nên `marketplace add` clone qua HTTPS thường và không máy
nào cần xác thực GitHub cho việc đó. Chuyện này đã kiểm chứ không đoán: clone
với credential helper và git config toàn cục đều tắt vẫn thành công. Đáng kể
nhất với VPS, vốn không màn hình và nếu không thì phải qua device flow hay token.

## Phát triển

Plugin đã cài chạy một **bản sao** Claude Code làm lúc cài. Một chỉnh sửa trong
bản làm việc này tới được phiên chỉ qua trọn vòng:

```bash
git push
claude plugin marketplace update sl-mod
claude plugin update sl-mod
# then /reload-plugins, or restart
```

Lúc đang viết mã thật thì bỏ hết chỗ đó và nạp thẳng thư mục. Một cờ trên một
lệnh, không theo dõi gì:

```bash
claude --plugin-dir ~/Workspace/Projects/personal_works/sl-mod
```

Cổng kiểm trước khi push:

```bash
claude plugin validate .
claude plugin test .
tsc -p .
```

`validate` in `gating hook without .catch: ...` cho các hook nắm chuỗi. Mấy dòng
đó không phải nhiễu: một dòng trong số đó nằm trên màn hình từ commit đầu tiên,
trong khi một `$.process.run` không được che trong một hook nắm chuỗi làm sập
ba phép dò, và lần nào cũng bị đọc lướt qua.

Các hình trong `docs/figures/` do script vẽ, không vẽ tay, bằng `figlib.mjs` của
skill `b3-figure-drawing`; bản tiếng Việt nằm ở `docs/figures/vi/`. Mỗi SVG mang
cả hai bảng màu và theo `prefers-color-scheme` của người đọc.

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

## Dòng trạng thái mà nó thay thế

Hai thứ từng giữ chỗ đó trước mod này, không phải một.

`reference/statusline-command.sh` là thứ đầu: 92 dòng bash Ban viết tay, đọc
JSON của engine từ stdin bằng `jq`. Hình dạng của nó là hình dạng của mod này
(dòng một `folder | model | Ctx:%`, dòng hai `5h` và `7d` kèm giờ reset và đếm
ngược), nên nó được giữ ở đây thay vì vứt. Nó là bản duy nhất; không repo nào
trên hai máy theo dõi nó, và nó nằm không ai đọc trong `~/.claude/` sau khi
khối `statusLine` bị gỡ. Nó được lưu trữ, không nối vào đâu: không gì trong mod
này đọc nó.

Nó cũng cho thấy cái giá mà mod sinh ra để bỏ. Mỗi lần vẽ lại chạy `bash`, rồi
`jq` năm lần, cộng `awk` và `date` cho từng trường.

`claude-powerline` tới sau và bị gỡ khỏi `~/.claude/settings.json` ngày
06/10/2026, nên dải là dòng trạng thái duy nhất trong cửa sổ lúc này. Muốn đặt
cái đó lại thì khối cũ là:

```json
"statusLine": {
  "type": "command",
  "command": "claude-powerline --config=~/.claude/powerline-config.json",
  "padding": 0
},
```

## Biểu tượng ở hàng một, chữ ở hàng hai

Hàng một dùng biểu tượng Nerd Font. Chúng vẽ nhỏ hơn chữ bên cạnh một chút và
mod không sửa được, vì mod không chọn font. Ký tự (glyph) nào JetBrains Mono
không có thì font dự phòng mà fontconfig với tới sẽ vẽ, theo số đo của font đó.

Đo bằng `fc-list :charset=<cp>`, nên kiểm lại được chứ không phải truyền miệng:

| | trong JetBrains Mono | từ font dự phòng |
|---|---|---|
| biểu tượng | `⌂ ✓ ● ⇡ ▲ ▼ ·` và ``  (E0B0) | ``  ``  `` (Nerd Font PUA) |
| đồng hồ | `■ □ █ ░ ▓` | `▰ ▱` (đang dùng), `▮ ▯` (effort) |

Hai điều rút ra từ bảng đó. Dấu ngăn powerline **có** trong JetBrains Mono, nên
nó vẽ đúng cỡ; nó chỉ bị thiếu, thành chuỗi rỗng, suốt bốn commit. Và cả hai
cặp thanh đang dùng đều là ký tự dự phòng: `██░░░` hay `■■□□□` sẽ là cặp thay
cùng cỡ, mỗi cặp một dòng, không đổi vì cặp hiện tại là thứ được yêu cầu.

Hàng hai dùng chữ: `ct`, `5h`, `7d`, và tên của chính mô hình cho cửa sổ theo
mô hình. Chữ vẽ đúng cỡ hàng, và hàng ngân sách là nửa phải đọc nhanh.

Mọi ký tự đặc biệt trong mã nguồn viết dưới dạng escape `\u{...}`. Viết thẳng
ký tự thì đã từng mất trong một lần ghi file, và triệu chứng rất lặng: mọi biểu
tượng thành chuỗi rỗng, và dấu ngăn powerline giữa hai ô không vẽ gì suốt bốn
commit.
