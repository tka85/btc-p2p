var BTCNetwork = require('../lib/BTCNetwork').BTCNetwork;
var dns = require('dns');
var util = require('util');

const MAGIC = {
  BTC_MAINNET: 0xD9B4BEF9,
  BTC_TESTNET: 0x0709110B,
  LTC_MAINNET: 0xD9B4BEF9,
  LTC_TESTNET: 0xF1C8D2FD
};

var n = new BTCNetwork({ port: 18333, magic: MAGIC.BTC_TESTNET });

// LE => BE and vice versa
function changeEndianess(str) {
  const result = [];
  let len = str.length - 2;
  while (len >= 0) {
    result.push(str.substr(len, 2));
    len -= 2;
  }
  return result.join('');
}

process.once('SIGINT', function () {
  console.log('Got SIGINT; closing...');
  process.once('SIGINT', function () {
    // Double SIGINT; force-kill
    process.exit(0);
  });
  n.shutdown();
});

// Error messages of various severity, from the PeerManager
n.on('error', function error(d) {
  console.log('(' + d.severity + '): ' + d.message);
});

n.on('status', function status(d) {
  console.log('PeerManager status:', d);
});

// Every message, from every active peer. Gets the message in its raw form (bubble up of 'message' from Peer)
n.on('message', function peerMessage(d) {
  console.log(d.peer.getUUID() + ': message', d.command, d.data);
});

// Specific message from the BTCManager. Gets the message in its parsed form
n.on('versionMessage', function versionMessage(d) {
  console.log('VERSION:', d);
});

n.on('transactionInv', function transactionInv(d) {
  console.log('Peer ' + d.peer.getUUID() + ' knows of Transaction ' + changeEndianess(d.hash.toString('hex')));
  n.getData({ type: 1, hash: d.hash }, d.peer, function (err, rs) {
    if (err !== false) {
      console.log('Data returned error: ' + err);
      return;
    }
    console.log('TX Hash >>>:', changeEndianess(rs[0].data.hash.toString('hex')));
    console.log('TX Data >>>:', util.inspect(rs, { depth: null }));
  });
});
n.on('transactionBlock', function transactionInv(d) {
  console.log('Peer ' + d.peer.getUUID() + ' knows of Block ' + d.hash.toString('hex'));
});

/*
// Default launch, with DNS seeds
n.launch();
*/

// Single launch
n.options.minPeers = 1;
n.options.maxPeers = 3;
// // Mainnet dns seed alternatives: seed.bitcoin.sipa.be
// mainnetDnsSeed = 'dnsseed.bluematt.me';
// // Testnet dns seed seed.tbtc.petertodd.org, seed.testnet.bitcoin.sprovoost.nl
// testnetDnsSeed = 'seed.tbtc.petertodd.org';
// dns.resolve4(testnetDnsSeed, function (err, addrs) {
//   if (err) {
//     console.log(err);
//     return;
//   }
//   n.launch(addrs.shift());
//   console.log(`>>> Adding peer address`, addrs);
//   n.manager.addPool(addrs);
// });

// Connect to locally running daemon
n.launch([{ host: 'localhost', port: 18333 }]);
