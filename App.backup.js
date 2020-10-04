/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {Component} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
} from 'react-native';

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  mediaDevices,
} from 'react-native-webrtc';

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      remoteStreamURL: null,
    };

    this.sock = null;
    this.wsuri = "wss://webrtc.ferdinandsilva.com/ws";
    this.pc = null;
  }

  componentDidMount() {
    let that = this;
    this.sock = new WebSocket(this.wsuri);
    this.sock.onclose = function(e) {
         that.sock = new WebSocket(that.wsuri); 
         that.sock.onclose = function(e) {
            this.sock = new WebSocket(this.wsuri); 
         }
    }

    this.sock.onmessage = function(e) {
        let sd = e.data;
        if (sd === '') {
            return alert('Session Description must not be empty')
        }

        try {
            that.pc.setRemoteDescription(new RTCSessionDescription({type:'answer', sdp:sd}))
        } catch (e) {
            alert(e);
        }
    }

    this.pc = new RTCPeerConnection({
      sdpSemantics: "unified-plan",
      iceServers: [{
      urls: [ "stun:ss-turn1.xirsys.com" ]
      }, {
      username: "nDc_obV6zSypEKQTiDtEca5CA6vYZLasLAjIf9VwVXBc54FFpQbv5PvUwili43_0AAAAAF9Jf8FzaXg1MTk=",
      credential: "a3bd4a9a-e97a-11ea-9bbd-0242ac140004",
      urls: [
        "turn:ss-turn1.xirsys.com:80?transport=udp",
        "turn:ss-turn1.xirsys.com:3478?transport=udp",
        "turn:ss-turn1.xirsys.com:80?transport=tcp",
        "turn:ss-turn1.xirsys.com:3478?transport=tcp",
        "turns:ss-turn1.xirsys.com:443?transport=tcp",
        "turns:ss-turn1.xirsys.com:5349?transport=tcp"
      ]
      }]
    });
    
    this.pc.onicecandidate = function(event) {
      if (event.candidate === null) { 
        that.sock.send(that.pc.localDescription.sdp);
      }
    };

    this.pc.addTransceiver('audio', {'direction': 'sendrecv'});
    this.pc.addTransceiver('video', {'direction': 'sendrecv'});

    this.pc.createOffer().then(d => this.pc.setLocalDescription(d));

    this.pc.onaddstream = function (event) {
      that.setState({
        remoteStreamURL: event.stream.toURL(),
      });
    };

  }

  render () {
    return (
      <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
      }}>
      <RTCView streamURL={this.state.remoteStreamURL} style={{width: 200,height: 150}}/>
    </View>
    );
  }
}

export default App;
