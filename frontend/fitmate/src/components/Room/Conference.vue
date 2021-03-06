<template>
	<div id="main-container" class="container" style="height: 100%">
		<div id="join" v-if="!session" style="height: 100%">
			<div id="join-dialog" class="jumbotron vertical-center" style="height: 100%; display:flex ;align-items:center ;justify-content:center">
				<div class="form-group">
					<p class="text-center">
						<button class="btn btn-lg btn-success" @click="joinSession()">Join!</button>
					</p>
				</div>
			</div>
		</div>

		<div id="session" v-if="session">			
			<div id="video-container" class="col-md-3" style="display: flex;">
				<user-video class="yourvideo" v-for="sub in subscribers" :key="sub.stream.connection.connectionId" :stream-manager="sub" @click.native="updateMainVideoStreamManager(sub)"/>
				<user-video class="myvideo" :stream-manager="publisher" @click.native="updateMainVideoStreamManager(publisher)"/>
			</div>
			<input class="btn btn-large btn-danger" type="button" id="buttonLeaveSession" @click="leaveSession" value="Leave session">
		</div>
	</div>
</template>

<script>
import axios from 'axios';
import { OpenVidu } from 'openvidu-browser';
import UserVideo from '@/components/UserVideo';

axios.defaults.headers.post['Content-Type'] = 'application/json';

// const OPENVIDU_SERVER_URL = "https://localhost:4443";
const OPENVIDU_SERVER_URL = "https://localhost:4443";
const OPENVIDU_SERVER_SECRET = "MY_SECRET";

export default {
	name: 'Conference',

	components: {
		UserVideo,
	},
	props:{
		me: Object,
		room: Object,
	},
	data () {
		return {
			OV: undefined,
			session: undefined,
			mainStreamManager: undefined,
			publisher: undefined,
			subscribers: [],

			mySessionId: "",
			myUserName: this.me.nickname,
		}
	},
	created(){
		// this.mySessionId =  this.$route.params.hostname;
	},
	mounted(){
		
	},
	destroyed(){
		this.leaveSession();
	},
	methods: {
		getRoomInfo(){

		},
		joinSession () {
			// --- Get an OpenVidu object ---
			this.OV = new OpenVidu();
			console.log(123123123);
			this.mySessionId = "Session"+this.room.id,
			console.log(this.mySessionId);
			console.log(this.room);
			// --- Init a session ---
			this.session = this.OV.initSession();

			// --- Specify the actions when events take place in the session ---

			// On every new Stream received...
			this.session.on('streamCreated', ({ stream }) => {
				const subscriber = this.session.subscribe(stream);
				this.subscribers.push(subscriber);
			});

			// On every Stream destroyed...
			this.session.on('streamDestroyed', ({ stream }) => {
				const index = this.subscribers.indexOf(stream.streamManager, 0);
				if (index >= 0) {
					this.subscribers.splice(index, 1);
				}
			});

			// On every asynchronous exception...
			this.session.on('exception', ({ exception }) => {
				console.warn(exception);
			});

			// --- Connect to the session with a valid user token ---

			// 'getToken' method is simulating what your server-side should do.
			// 'token' parameter should be retrieved and returned by your own backend
			this.getToken(this.mySessionId).then(token => {
				this.session.connect(token, { clientData: this.myUserName })
					.then(() => {

						// --- Get your own camera stream with the desired properties ---

						let publisher = this.OV.initPublisher(undefined, {
							audioSource: undefined, // The source of audio. If undefined default microphone
							videoSource: undefined, // The source of video. If undefined default webcam
							publishAudio: true,  	// Whether you want to start publishing with your audio unmuted or not
							publishVideo: true,  	// Whether you want to start publishing with your video enabled or not
							// resolution: '640x480',  // The resolution of your video
							resolution: '320x240',  // The resolution of your video
							frameRate: 30,			// The frame rate of your video
							insertMode: 'APPEND',	// How the video is inserted in the target element 'video-container'
							mirror: true       	// Whether to mirror your local video or not
						});

						this.mainStreamManager = publisher;
						this.publisher = publisher;

						// --- Publish your stream ---

						this.session.publish(this.publisher);
					})
					.catch(error => {
						console.log('There was an error connecting to the session:', error.code, error.message);
					});
			});

			window.addEventListener('beforeunload', this.leaveSession)
		},

		leaveSession () {
			// --- Leave the session by calling 'disconnect' method over the Session object ---
			if (this.session) this.session.disconnect();

			this.session = undefined;
			this.mainStreamManager = undefined;
			this.publisher = undefined;
			this.subscribers = [];
			this.OV = undefined;

			window.removeEventListener('beforeunload', this.leaveSession);
		},

		updateMainVideoStreamManager (stream) {
			if (this.mainStreamManager === stream) return;
			this.mainStreamManager = stream;
		},

		/**
		 * --------------------------
		 * SERVER-SIDE RESPONSIBILITY
		 * --------------------------
		 * These methods retrieve the mandatory user token from OpenVidu Server.
		 * This behavior MUST BE IN YOUR SERVER-SIDE IN PRODUCTION (by using
		 * the API REST, openvidu-java-client or openvidu-node-client):
		 *   1) Initialize a Session in OpenVidu Server	(POST /openvidu/api/sessions)
		 *   2) Create a Connection in OpenVidu Server (POST /openvidu/api/sessions/<SESSION_ID>/connection)
		 *   3) The Connection.token must be consumed in Session.connect() method
		 */

		getToken (mySessionId) {
			return this.createSession(mySessionId).then(sessionId => this.createToken(sessionId));
		},

		// See https://docs.openvidu.io/en/stable/reference-docs/REST-API/#post-openviduapisessions
		createSession (sessionId) {
			return new Promise((resolve, reject) => {
				axios
					.post(`${OPENVIDU_SERVER_URL}/openvidu/api/sessions`, JSON.stringify({
						customSessionId: sessionId,
					}), {
						auth: {
							username: 'OPENVIDUAPP',
							password: OPENVIDU_SERVER_SECRET,
						},
					})
					.then(response => response.data)
					.then(data => resolve(data.id))
					.catch(error => {
						if (error.response.status === 409) {
							resolve(sessionId);
						} else {
							console.warn(`No connection to OpenVidu Server. This may be a certificate error at ${OPENVIDU_SERVER_URL}`);
							if (window.confirm(`No connection to OpenVidu Server. This may be a certificate error at ${OPENVIDU_SERVER_URL}\n\nClick OK to navigate and accept it. If no certificate warning is shown, then check that your OpenVidu Server is up and running at "${OPENVIDU_SERVER_URL}"`)) {
								location.assign(`${OPENVIDU_SERVER_URL}/accept-certificate`);
							}
							reject(error.response);
						}
					});
			});
		},

		// See https://docs.openvidu.io/en/stable/reference-docs/REST-API/#post-openviduapisessionsltsession_idgtconnection
		createToken (sessionId) {
			return new Promise((resolve, reject) => {
				axios
					.post(`${OPENVIDU_SERVER_URL}/openvidu/api/sessions/${sessionId}/connection`, {}, {
						auth: {
							username: 'OPENVIDUAPP',
							password: OPENVIDU_SERVER_SECRET,
						},
					})
					.then(response => response.data)
					.then(data => resolve(data.token))
					.catch(error => reject(error.response));
			});
		},
	}
}
</script>
<style>
#video-container{
	margin: 0%;
}

#video-container p{
	display: block;
	color: black; font-size: 1.7rem;
	font-weight: bold;
	text-align: center;
	font-family: 'GangwonEdu_OTFBoldA';
	width: 100%;
	height: auto;
}
@media (min-width:1800px) {
	video#local-video-undefined {
		margin-left: 5%;
		width: 500px;
		height: 375px;
	}
	video {
		width: 700px;
		height: 525px;
	}
}
@media (min-width:1425px) and (max-width:1799px) {
	video#local-video-undefined {
		margin-left: 5%;
		width: 300px;
		height: 227px;
	}
	video {
		width: 670px;
		height: 500px;
	}
}

@media (min-width:1200px) and (max-width:1424px) {
	video#local-video-undefined {
		margin-left: 5%;
		width: 265px;
		height: 200px;
	}
	video {
		width: 530px;
		height: 400px;
	}
}

@media (min-width:992px) and (max-width:1199px) {
	#footer {
		display: none;
	}
	video#local-video-undefined {
		margin-left: 5%;
		width: 470px;
		height: 400px;
	}
	video {
		width: 470px;
		height: 400px;
	}
}
@media (max-width:991px) {
	#footer {
		display: none;
	}
	#video-container {
		flex-wrap: wrap;
	}
	video#local-video-undefined {
		width: 470px;
		height: 400px;
	}
	video {
		width: 470px;
		height: 400px;
	}
}
.container {
	padding:0%
}
#buttonLeaveSession {
	text-align: right;
}
</style>
