/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {Component} from 'react';
import {
  Button,
  SafeAreaView, 
  ScrollView,  
  Text,
} from 'react-native';

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
  mediaDevices,
} from 'react-native-webrtc';

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      localStream: null,
      remoteStreamsURL: {},
      videoText: 'Video On',
      audioText: 'Audio On',
      isDisconnected: false,
      disabledDisconnected: false,
    };

    this.local_stream = null;
    this.current_id = "";
    this.connection = null;
    this.read_connection = null;
    this.ws_uri = "wss://webrtc.ferdinandsilva.com/ws";
    this.got_sdp = false;
    this.video_enabled = true;
    this.audio_enabled = true;
    this.connection_config = {
        //sdpSemantics: "unified-plan",
        iceServers: [{
            urls: ["stun:ss-turn2.xirsys.com"]
        }, 
        {
            username: "XPuBFcTtxp7gR33zEmM1wG3QQwCCpb6E8wE18XjAwBKGTUx3B4igdYGtJtiy1V7fAAAAAF99ZtpzaXg1MTky",
            credential: "5e296a18-086a-11eb-89b1-0242ac140004",
            urls: [
                "turn:ss-turn2.xirsys.com:80?transport=udp",
                "turn:ss-turn2.xirsys.com:3478?transport=udp",
                "turn:ss-turn2.xirsys.com:80?transport=tcp",
                "turn:ss-turn2.xirsys.com:3478?transport=tcp",
                "turns:ss-turn2.xirsys.com:443?transport=tcp",
                "turns:ss-turn2.xirsys.com:5349?transport=tcp"
            ]
        }]
    };

    this.connection_config2 = {
        sdpSemantics: "unified-plan",
        iceServers: [{
            urls: ["stun:ss-turn2.xirsys.com"]
        }, 
        {
            username: "XPuBFcTtxp7gR33zEmM1wG3QQwCCpb6E8wE18XjAwBKGTUx3B4igdYGtJtiy1V7fAAAAAF99ZtpzaXg1MTky",
            credential: "5e296a18-086a-11eb-89b1-0242ac140004",
            urls: [
                "turn:ss-turn2.xirsys.com:80?transport=udp",
                "turn:ss-turn2.xirsys.com:3478?transport=udp",
                "turn:ss-turn2.xirsys.com:80?transport=tcp",
                "turn:ss-turn2.xirsys.com:3478?transport=tcp",
                "turns:ss-turn2.xirsys.com:443?transport=tcp",
                "turns:ss-turn2.xirsys.com:5349?transport=tcp"
            ]
        }]
    };


    this.pc_out = null;
    this.pc_ins = {};
    this.pc_backup_streams = {};

    this.set_video_publish = this.set_video_publish.bind(this);
    this.create_out = this.create_out.bind(this);
    this.set_video = this.set_video.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleOnClose = this.handleOnClose.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.videoControl = this.videoControl.bind(this);
    this.audioControl = this.audioControl.bind(this);
    this.debugNow = this.debugNow.bind(this);
    this.streamChecker = this.streamChecker.bind(this);
  }

  streamChecker() {
    var that = this;

    Object.keys(that.pc_ins).forEach((key, index) => {

      try {
        if (!that.state.remoteStreamsURL.hasOwnProperty(key)) {
          let stream_to_save = that.state.remoteStreamsURL;
          stream_to_save[key] = that.pc_backup_streams[key];
          that.setState({
            remoteStreamsURL: stream_to_save,
          });
        }
      } catch(e) {
        console.log(`An error occurred on streamChecker: ${e}`);
      }
    });

    setTimeout(that.streamChecker, 5000);
  }

  debugNow(e) {
    console.log(this.state.remoteStreamsURL);
    console.log('The keys are:');
    Object.keys(this.pc_ins).forEach((key, index) => {
      console.log(key);
    });
  }

  disconnect(e) {
    var that = this;
    if (this.got_sdp) {
        this.setState({
          disabledDisconnected: true,
        });
        this.connection.send(JSON.stringify({
            command: "disconnect",
            current_id: this.current_id
        }));
        this.setState({
          isDisconnected: true,
        });

        try {
          this.connection.close()
          this.read_connection.close()
          this.connection = null;
          this.read_connection = null;
          this.pc_out.close();
          this.pc_out = null;

          Object.keys(this.pc_ins).forEach((key, index) => {
            that.pc_ins[key].close();
          });

          this.pc_ins = {};
        } catch(e) {
          console.log(`An error occurred on disconnect: ${e}`);
        }
    }
  }

  videoControl(e) {
    if (this.got_sdp) {
        if (this.video_enabled) {
            this.video_enabled = false;
            this.local_stream.getVideoTracks()[0].enabled = false;
            this.setState({
              videoText: 'Video Off'
            });
        } else {
            this.video_enabled = true;
            this.local_stream.getVideoTracks()[0].enabled = true;
            this.setState({
              videoText: 'Video On'
            });
        }
    }
  }

  audioControl(e) {
    if (this.got_sdp) {
        if (this.audio_enabled) {
            this.audio_enabled = false;
            this.local_stream.getAudioTracks()[0].enabled = false;
            this.setState({
              audioText: 'Audio Off'
            });
        } else {
            this.audio_enabled = true;
            this.local_stream.getAudioTracks()[0].enabled = true;
            this.setState({
              audioText: 'Audio On'
            });
        }
    }
  }


  set_video_publish(local_description) {
    var that = this;
    this.connection = new WebSocket(this.ws_uri);
    this.connection.onopen = () => {
        try {
            that.connection.send(JSON.stringify({
                command: "send_sdp",
                current_id: that.current_id,
                data: local_description
            }));
        } catch(e) {
            setTimeout(function(){
                that.set_video_publish(local_description);
            }, 2000);
        }
    };
    this.connection.onmessage = function(event){
      that.handleMessage(event);
    };
    this.connection.onclose = function(){
      that.handleOnClose()
    };
  }

  create_out() {
    var that = this;
    this.pc_out = new RTCPeerConnection(this.connection_config);

    this.pc_out.onicecandidate = event => {
        if (event.candidate === null) {
            this.set_video_publish(this.pc_out.localDescription.sdp);
        }
    };

    this.pc_out.onconnectionstatechange = function(event) {
      switch(that.pc_out.connectionState) {
          case "connected":
          break;
          case "disconnected":
              //reconnect if got disconnected
              if (!that.state.isDisconnected) {
                that.got_sdp = false;
                that.create_out();
              }
          break;
          case "failed":
          break;
          case "closed":
          break;
      }
    }

    this.pc_out.addStream(this.local_stream);
    this.pc_out.createOffer().then(d => this.pc_out.setLocalDescription(d)).catch(err => {
        alert(`An error occurred: ${err}`);
    });
  }

  set_video(id) {
    var that = this;
    that.read_connection = new WebSocket(that.ws_uri);

    that.read_connection.onopen = () => {
        try {
            that.read_connection.send(JSON.stringify({
                command: "send_sdp_in",
                current_id: id,
                data: that.pc_ins[id].localDescription.sdp
            }));
        } catch(e) {
            setTimeout(function(){
                that.set_video(id);
            }, 2000);
        }
    };

    that.read_connection.onmessage = event => {
        let data = JSON.parse(event.data);
        if (data.command == 'send_sdp_in') {
            try {
                that.pc_ins[data.current_id].setRemoteDescription(new RTCSessionDescription({type:'answer', sdp:data.data}))
            } catch (e) {
                alert(e)
            }            
        } 
    };
  }

  handleMessage(event) {
    let data = JSON.parse(event.data);
    var that = this;
    if (data.command == 'init') {
        this.current_id = data.current_id;
    } else if (data.command == 'send_sdp') {
      try {
          this.pc_out.setRemoteDescription(new RTCSessionDescription({type:'answer', sdp:data.data}))
          this.got_sdp = true;
      } catch (e) {
          alert(e);
      }

    } else if (data.command == 'clients') {

      if (!that.current_id) {
        return;
      }

      let splitted_data = data.data.split(',');

      for (let id of splitted_data) {
          if (id != "" && id != that.current_id) {
              if (!that.pc_ins.hasOwnProperty(id)) {
                  that.pc_ins[id] = new RTCPeerConnection(that.connection_config2);

                  that.pc_ins[id].onicecandidate = event => {
                      if (event.candidate === null) {
                          that.set_video(id);
                      }
                  };

                  that.pc_ins[id].addTransceiver('audio', {'direction': 'sendrecv'});
                  that.pc_ins[id].addTransceiver('video', {'direction': 'sendrecv'});

                  that.pc_ins[id].createOffer().then(d => that.pc_ins[id].setLocalDescription(d)).catch(err => {
                      alert(`An error occurred: ${err}`);
                  });

                  that.pc_ins[id].onaddstream = function (event) {
                    let stream_to_save = that.state.remoteStreamsURL;
                    stream_to_save[id] = event.stream.toURL();
                    that.pc_backup_streams[id] = event.stream.toURL();
                    that.setState({
                      remoteStreamsURL: stream_to_save,
                    });
                  };

              }
          }
      }

    } else if (data.command == 'disconnected') {

      try {
          let videos = that.state.remoteStreamsURL;
          delete videos[data.current_id];
          console.log('ID to delete:');
          console.log(data.current_id);
          console.log('The current videos:');
          console.log(videos);
          this.setState({
            remoteStreamsURL: videos
          });
          delete that.pc_backup_streams[data.current_id];
      }catch(e) {
        console.log('Error occurred on disconnect delete remoteStreamsURL...');
        console.log(`An error occurred: ${e}`);
      }

      try {
          delete that.pc_ins[data.current_id];
      }catch(e) {
        console.log('Error occurred on disconnect delete pc_ins...');
        console.log(`An error occurred: ${e}`);
      }
    }
  }

  handleOnClose() {
    this.connection = new WebSocket(this.ws_uri);
    this.connection.onmessage = this.handleMessage;
    this.connection.onclose = this.handleOnClose;
  }

  componentDidMount() {

    let isFront = true;
    mediaDevices.enumerateDevices().then(sourceInfos => {
      let videoSourceId;
      for (let i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if(sourceInfo.kind == "videoinput" && sourceInfo.facing == (isFront ? "front" : "environment")) {
          videoSourceId = sourceInfo.deviceId;
        }
      }
      mediaDevices.getUserMedia({
        audio: true,
        video: {
          mandatory: {
            minWidth: 500,
            minHeight: 300,
            minFrameRate: 30
          },
          facingMode: (isFront ? "user" : "environment"),
          optional: (videoSourceId ? [{sourceId: videoSourceId}] : [])
        }
      })
      .then(stream => {
        var that = this;
        this.local_stream = stream;
        this.setState({
          localStream: stream.toURL()
        });

        this.connection = new WebSocket(this.ws_uri);
        this.connection.onopen = () => {
            this.connection.send(JSON.stringify({
                command: "init",
                current_id: this.current_id
            }));
        };
        this.connection.onmessage = function(event){
          that.handleMessage(event);
        };
        this.connection.onclose = function(){
          that.handleOnClose()
        };

        this.create_out();
        this.streamChecker();
      })
      .catch(err => {
        alert(`An error occurred: ${err}`);
      });
    });
  }

  render () {

    if (this.state.isDisconnected) {
      return (
        <SafeAreaView style={{flex: 1}}>
          <Text>Disconnected...</Text>
        </SafeAreaView>
      );
    } else {
      return (
        <SafeAreaView style={{flex: 1}}>
          <Button onPress={this.debugNow} title="Debug" />
          <Button onPress={this.disconnect} title="Disconnect" disabled={this.state.disabledDisconnected} />
          <Button onPress={this.videoControl} title={this.state.videoText} />
          <Button onPress={this.audioControl} title={this.state.audioText} />
          <ScrollView contentContainerStyle={{alignItems: 'center'}}>
            <RTCView streamURL={this.state.localStream} style={{width: 426,height: 240, marginBottom: '2%', marginTop: '2%'}} />
  
            {Object.keys(this.state.remoteStreamsURL).map((key)=>(
                  <RTCView key={key} streamURL={this.state.remoteStreamsURL[key]} style={{width: 426,height: 240, marginBottom: '2%', marginTop: '2%'}}/>
            ))}
  
          </ScrollView>
        </SafeAreaView>
      );
    }
  }
}

export default App;
