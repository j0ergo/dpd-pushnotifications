dpd-gcm
=======

A very simple Deployd Resource for connectivity to the Google Cloud Messaging (GCM)

Include in your package.json like
<pre>
  "dependencies": {
    "dpd-gcm": "git+ssh://git@github.com:ozzroach/dpd-gcm.git"
  }
</pre>
then do
<pre>
npm install
</pre>
Usage in a Deployd-Event-Handler:
<pre>
dpd.gcm.post({
		registrationIds: ["...", "..."],
		title: "...",
		message: "...",
		msgcnt: "...",
		soundname: "...",
		collapseKey: "...",
		delayWhileIdle: true,
		timeToLive: 4000
	},
	function (err, results) {
    	console.log(results);
	}
)
</pre>