# future-friend-letter
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>未来的朋友信件</title>
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #f6f8fa, #dbe4f0);
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    }

    .envelope {
      position: relative;
      width: 280px;
      height: 200px;
      cursor: pointer;
      perspective: 1000px;
    }

    /* 信封外观 */
    .envelope-front {
      width: 100%;
      height: 100%;
      background: #fff;
      border: 2px solid #ccc;
      border-radius: 6px;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 2;
      transition: transform 0.8s ease-in-out;
      transform-origin: top;
    }

    .envelope.open .envelope-front {
      transform: rotateX(-180deg);
    }

    .envelope-back {
      width: 100%;
      height: 100%;
      background: #f2f2f2;
      border: 2px solid #ccc;
      border-radius: 6px;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1;
    }

    /* 信件 */
    .letter {
      width: 260px;
      height: 180px;
      background: #fff;
      border: 1px solid #ddd;
      padding: 20px;
      box-sizing: border-box;
      position: absolute;
      top: 10px;
      left: 10px;
      opacity: 0;
      transform: translateY(20px);
      transition: all 1s ease;
      overflow-y: auto;
    }

    .envelope.open .letter {
      opacity: 1;
      transform: translateY(0);
      z-index: 3;
    }
  </style>
</head>
<body>
  <div class="envelope" id="envelope">
    <div class="envelope-front"></div>
    <div class="envelope-back"></div>
    <div class="letter">
      <p>嗨，未来的朋友：</p>
      <p>其实我年纪也不算大，但这过去一年多创业的经历，确实让我成长了不少。不像刚来英国的时候，还带着点毛头小子的冲劲，现在算是比较成熟了吧。说实话，这一年多几乎没什么社交，每天就是工作和学业，忙到后来甚至都忘了，社交的意义到底是什么。创业带来的压力确实挺大，有时候也会感慨，当初站在十字路口的选择，如果换个方向，会不会走到另一种人生。</p>
      <p>这次参加活动，我是想给自己一个机会，重新认识一位知心的朋友。希望能聊聊生活里的小事，不只是工作、项目、deadline这些东西。你好，未来的朋友，希望遇见你之后，我的生活能多点色彩，也能变得更加美好。</p>
    </div>
  </div>

  <script>
    const envelope = document.getElementById("envelope");
    envelope.addEventListener("click", () => {
      envelope.classList.toggle("open");
    });
  </script>
</body>
</html>
