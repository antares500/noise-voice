function initAudioNodes(stream) {
	//if tuna nodes will be used, then tuna object needs to be created
	tuna = new Tuna(context);
	$(".mic-status").addClass("label-success").text("on");
	var audioNodes = new AudioNodes ( stream, [ "delay", "tunachorus", "streamDestination"] );
};

function AudioNodes(stream, nodesNames) {
	//if no extra nodes were provided default to an empty array
	this.nodes = nodesNames || [ ];
	//add the default nodes to the array of nodes' names
	this.nodes.unshift("input");
	this.nodes.push("gain", "compressor", "destination");
	
	//if streamDestination is part of the array, move it to the end of the array
	var index = this.nodes.indexOf("streamDestination");
	if (index > -1) {
		this.nodes.splice(index, 1);
		this.nodes.push("streamDestination");
	}
	this.stream = stream;
	this.createNodes();
}

AudioNodes.prototype.createNodes = function () {	
	for (i=0;i <this.nodes.length; i++)	{
		var nodeName = this.nodes[ i ];
		this.nodes[ i ] = {"name": nodeName};
		switch( nodeName ) {
			case "input":
				var node = context.createMediaStreamSource( this.stream );	
				break;
			case "delay":
				//max delay time is 5 seconds
				var node = context.createDelay(5);
				node.delayTime.value = 0;
				break;
			case "gain":
				var node = context.createGain();
				//default gain value
				node.gain.value = 0.5;
				break;
			case "tunachorus":
				var node = new tuna.Chorus({
					 rate: 8,         //0.01 to 8+
					 feedback: 0.85,     //0 to 1+
					 delay: 0.0045,     //0 to 1
					 bypass: 0          //the value 1 starts the effect as bypassed, 0 or 1
				 });
				break;
			case "compressor":
				var node = context.createDynamicsCompressor();
				break;
			case "streamDestination":
				var node = context.createMediaStreamDestination();
				break;	
			case "destination":
				var node = context.destination;
				break;
			default:
				console.error(this.nodes[ i ]+" is not an allowed node type");
				return;
		}
		if (typeof node =='object') { 
			//set the connection status of each node to connected
			this.nodes[ i ].node =  node; 
			this.nodes[ i ].node.isConnected=true;
			
		}
	
		//connect the nodes
		if ( i>0 ) {
			//connect streamDestination to the node before destination (compressor)
			if ( this.nodes[ i ].name =="streamDestination" )	{
				this.nodes[ i-2 ].node.connect( this.nodes[ i ].node);
			} else {
				this.nodes[ i-1 ].node.connect( this.nodes[ i ].node.input || this.nodes[ i ].node);
			}
		}
	}
	this.attachEvents(this.nodes);
};

AudioNodes.prototype.attachEvents = function(nodes) {
	var that=this;
	for ( i=0; i<nodes.length; i++  ) {
		switch ( nodes[ i ].name ){
			case "delay":
				var d = nodes[ i ];
				$(".delay-switch").change(d, function( ) {
					//console.log("switch "+n.name)
					that.nodeSwitch( d );
				});
				$(".delay-value").change(d, function() {
					that.nodeChangeValue(d , this);
				});
				break;
			case "gain":
				var g = nodes[ i ];
				$(".gain-value").change( g, function() {
					that.nodeChangeValue(g, this);
				});
				break;
			case "tunachorus":
				var tc = nodes[ i ];
				$(".tunachorus-switch").change(tc, function() {
					that.nodeSwitch( tc );
				});
				$(".tunachorus-delay").change(tc, function() {
					that.nodeChangeValue(tc, this);
				});
				break;
		}//switch
	}//for
};

AudioNodes.prototype.nodeSwitch = function(nodeToSwitch) {
	//get the previous and next connected nodes in audio graph
	//look for a node which is connected and brake
	var nodeIndex = this.nodes.indexOf(nodeToSwitch);
	for (i=1; i < this.nodes.length; i++) {
		if (this.nodes[ nodeIndex - i ].node.isConnected) { 
			 var previousNode   = this.nodes[ nodeIndex - i ].node || null; 
			break;
		}
	}
	for (i=1; i < this.nodes.length; i++) {
		if (this.nodes[ nodeIndex +i ].node.isConnected) { 
			var nextNode   = this.nodes[ nodeIndex + i ].node || null; 
			break;
		}
	}
	//disconnect the node if its connected, otherwise - connect 
	if ( nodeToSwitch.node.isConnected ) {
		previousNode.disconnect(0);
		nodeToSwitch.node.disconnect(0);
		previousNode.connect(nextNode.input || nextNode);
	} else {
		previousNode.disconnect(0);
		previousNode.connect(nodeToSwitch.node.input || nodeToSwitch.node);
		nodeToSwitch.node.connect(nextNode.input || nextNode);
	}
	//toogle node's connection state
	nodeToSwitch.node.isConnected = !nodeToSwitch.node.isConnected;
};


AudioNodes.prototype.nodeChangeValue = function (nodeToAdjust, element) {
	var val = parseFloat(element.value);
	var node = nodeToAdjust.node;
	if (node instanceof GainNode) {
			node.gain.value = val;
	}
	if (node instanceof DelayNode) {
		node.delayTime.value = val;
	}
	if (node instanceof Tuna.prototype.Chorus) {
		switch (element.name){
			case "rate":
				node.rate = val;
				break;
			case "feedback":
				node.feedback = val;
				break;
			case "delay":
				node.delay = val;
				break;
			case "bypass":
				node.bypass = val;
				break;
			default:
				console.error($(element).attr("name")+" is not an allowed setting name for tunaChorus node");
		}
	}
}
