var { RTCPeerConnection, RTCSessionDescription } = window;

var SOCKET;
var VIDEO_CONTAINER;
var LOCAL_VIDEO;

var CONSTRAINTS = { audio: true, video: true };
var SCREEN_CONSTRAINTS = { video: { cursor: "always" }, audio: false };
var online_users = {};
var user_count = 0;
var all_peers = {};

var isAlreadyCalling = false;
var cameraToggle = true;

var insertUser = function (user_id) {
  peerConstructor(user_id);
};

var removeUser = function (user_id) {
  $(all_peers[user_id]["htmlVideoObject"]).remove();
  delete all_peers[user_id];
};

var getAllUsers = function (user_list) {
  $.each(user_list, function (key, element) {
    insertUser(key);
    callUser(key);
  });
};

var callUser = async function (user_id) {
  console.log("Calling " + user_id);
  var getPeer = all_peers[user_id];
  if (getPeer["waitingConnection"] < 2) {
    var offer = await getPeer["peerConnection"].createOffer();
    await getPeer["peerConnection"].setLocalDescription(
      new RTCSessionDescription(offer)
    );
    SOCKET.emit("call-user", { offer, to: user_id });
    getPeer["waitingConnection"]++;
  }
};

var peerConstructor = function (key) {
  if (!!!all_peers[key]) {
    var newPeerConnection = new RTCPeerConnection({
      iceServers: [
        {
          'urls': [
            "stun:g3ws.dev.br:3478",
            "stun:g3ws.dev.br:5349",
            "stun:g3ws.dev.br:3478?transport=udp",
            "stun:g3ws.dev.br:5349?transport=udp",
          ],
        },
        {
          'urls': [
            "turn:g3ws.dev.br:3478",
            "turn:g3ws.dev.br:5349",
            "turn:g3ws.dev.br:3478?transport=udp",
            "turn:g3ws.dev.br:5349?transport=udp"
          ],
          'username': "sirrenan",
          'credential': "re123123"
        },
      ],
    });

    var newObject = $.parseHTML(
      '<video id="video-' + key + '"  autoplay></video>'
    );
    $(VIDEO_CONTAINER).append(newObject);
    all_peers[key] = {
      peerConnection: newPeerConnection,
      htmlVideoId: "video-" + key,
      htmlVideoObject: newObject[0],
      waitingConnection: 0,
    };

    var stream = $("#video-local")[0].srcObject;
    var camVideoTrack;
    var videoSender;
    var camAudioTrack;
    var audioSender;
    try {
      camVideoTrack = stream.getVideoTracks()[0];
      camAudioTrack = stream.getAudioTracks()[0];

      videoSender = newPeerConnection.addTrack(camVideoTrack, stream);
      audioSender = newPeerConnection.addTrack(camAudioTrack, stream);

      newPeerConnection.ontrack = function ({ streams: [stream] }) {
        var remoteVideo = all_peers[key]["htmlVideoObject"];
        if (remoteVideo) {
          console.log(all_peers[key]["htmlVideoObject"]);
          console.log(stream);
          remoteVideo.srcObject = stream;
        }
      };

      all_peers[key]["videoSender"] = videoSender;
      all_peers[key]["audioSender"] = audioSender;

      // stream
      //   .getTracks()
      //   .forEach((track) => newPeerConnection.addTrack(track, stream));
    } catch (e) {}
  }
  return all_peers[key];
};

var initialize_media = async function () {
  await get_media();
  $("#debugger").text("AFTET GET MEDIA");
  initialize_connection();
};

var get_media = async function () {
  $("#debugger").text("GET MEDIA");
  var stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
    $("#video-local")[0].srcObject = stream;
  } catch (err) {
    // REMOVE VIDEO-LOCAL
  }
  return stream;
};

var get_screen = async function () {
  var stream = null;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia();
    $("#video-local")[0].srcObject = stream;
  } catch (err) {
    alert("No Media Detected");
  }
  return stream;
};

var toggleMedia = async function () {
  var stream = null;
  cameraToggle = !cameraToggle;
  if (cameraToggle) {
    stream = await get_media();
  } else {
    stream = await get_screen();
  }
  var newTrack = stream.getVideoTracks()[0];
  $.each(all_peers, function (key, element) {
    all_peers[key]["videoSender"].replaceTrack(newTrack);
  });
};
