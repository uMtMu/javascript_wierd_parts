var ServerList = require('../commons/collections/tenant_servers_list'),
        NetworkList = require('../commons/collections/extended_network_list'),
        RouterList = require('../commons/collections/router_list'),
        PortList = require('../commons/collections/port_list');
SubnetList = require('../commons/collections/subnet_list');

function gettext(text) {
    // If no global function, revert to just returning given text.
    return text;
}



/*
    Object kontructor!!

function Tree(name) {
  this.name = name;
}

var theTree = new Tree('Redwood');
console.log('theTree.constructor is ' + theTree.constructor);

*/

/*

    for (var key in data) {
    
    // Kreate with only own properties
        if ({}.hasOwnProperty.call(data, key)) {
            this[key] = data[key];
        }
    }

*/

function Network(data) {
    for (var key in data) {
        if ({}.hasOwnProperty.call(data, key)) {
            this[key] = data[key];
        }
    }
    this.iconType = 'text';
    this.icon = '\uf0c2'; // Cloud
    this.collapsed = false;
    this.type = 'network';
    this.type2Display = 'Network';
    this.instances = 0;
    this.lastTouch = 0;
}

function ExternalNetwork(data) {
    for (var key in data) {
        if ({}.hasOwnProperty.call(data, key)) {
            this[key] = data[key];
        }
    }
    this.collapsed = false;
    this.iconType = 'text';
    this.icon = '\uf0ac'; // Globe
    this.instances = 0;
    this.type2Display = 'External Network';
    this.lastTouch = 0;
}

function Router(data) {
    for (var key in data) {
        if ({}.hasOwnProperty.call(data, key)) {
            this[key] = data[key];
        }
    }
    this.iconType = 'path';
    this.svg = 'router';
    this.networks = [];
    this.ports = [];
    this.type = 'router';
    this.type2Display = 'Router';
    this.lastTouch = 0;
}

function Server(data) {
    for (var key in data) {
        if ({}.hasOwnProperty.call(data, key)) {
            this[key] = data[key];
        }
    }
    this.iconType = 'text';
    this.icon = '\uf108'; // Server
    this.networks = [];
    this.type = 'instance';
    this.type2Display = 'Virtual Server';
    this.ip_addresses = [];
    this.lastTouch = 0;
}

var TopologyView = Backbone.View.extend({
    serverList: null,
    networkList: null,
    routerList: null,
    portList: null,
    subnetList: null,

    fa_globe_glyph: '\uf0ac',
    fa_globe_glyph_width: 15,
    svg: '#topology_canvas',
    nodes: [],
    links: [],
    data: [],
    zoom: d3.behavior.zoom(),
    data_loaded: false,
    svg_container: '#topologyCanvasContainer',
    post_messages: '#topologyMessages',
    balloonTmpl: null,
    balloon_deviceTmpl: null,
    balloon_portTmpl: null,
    balloon_netTmpl: null,
    balloon_instanceTmpl: null,
    network_index: {},
    balloonID: null,
    reload_duration: 10000,
    network_height: 0,
    previous_message: null,
    deleting_device: null,
    forceStart: false,

    fetched: {
        server_fetched: false,
        networks_fetched: false,
        ports_fetched: false,
        subnets_fetched: false,
        routers_fetched: false,
        isAllFetched: function () {
            return (this.servers_fetched &&
                    this.networks_fetched &&
                    this.ports_fetched &&
                    this.subnets_fetched &&
                    this.routers_fetched);
        },
        clearFetched: function () {
            this.servers_fetched = false;
            this.networks_fetched = false;
            this.ports_fetched = false;
            this.routers_fetched = false;
            this.subnets_fetched = false;
        }
    },
    initialize: function () {
        this.serverList = new ServerList(),
                this.networkList = new NetworkList(),
                this.routerList = new RouterList(),
                this.portList = new PortList();
        this.subnetList = new SubnetList();
        
        //  TopologyView modeli serverList üyesinin 'sync' olayı tetiklendiğinde son parametredeki fonksiyonu çalıştır
        this.listenTo(this.serverList, 'sync', this.renderServerList);
        this.listenTo(this.networkList, 'sync', this.renderNetworkList);
        this.listenTo(this.routerList, 'sync', this.renderRouterList);
        this.listenTo(this.portList, 'sync', this.renderPortList);
        this.listenTo(this.subnetList, 'sync', this.renderSubnetList);
        this.initRender();
    },
    check_router_external_port: function (ports, router_id, network_id) {
        ports.forEach(function (port) {
            if (port['networkId'] == network_id && port['deviceId'] == router_id) {
                return true;
            }
        });
        return false;
    },
    prepare_gateway_ports: function (routers, ports) {
        var self = this;
        var fakeRoutes = [];

        routers.forEach(function (router) {
            var external_gateway_info = router.external_gateway_info;
            if (external_gateway_info !== undefined) {
                var external_network = external_gateway_info.network_id;
                if (external_network !== undefined) {
                    if (self.check_router_external_port(ports, router['id'], external_network) == false)
                    {
                        var fakePort = {'id': 'gateway' + external_network,
                            'networkId': external_network,
                            'deviceId': router['id'],
                            'fixedIps': []}
                        fakeRoutes.push(fakePort);
                    }
                }
            }

        });

        return fakeRoutes;
    },
    renderServerList: function () {
        var self = this;
        self.fetched.servers_fetched = true;
        // Kome to point. Hangisinin önce bittiği bilinmediğinden isAllFetched sorgulanıyor.
        if (self.fetched.isAllFetched()) {
            self.render();
        }
    },
    renderSubnetList: function () {
        var self = this;
        self.fetched.subnets_fetched = true;
        if (self.fetched.isAllFetched()) {
            self.render();
        }
    },
    renderNetworkList: function () {
        var self = this;
        self.fetched.networks_fetched = true;
        if (self.fetched.isAllFetched()) {
            self.render();
        }
    },
    renderRouterList: function () {
        var self = this;
        self.fetched.routers_fetched = true;
        if (self.fetched.isAllFetched()) {
            self.render();
        }
    },
    renderPortList: function () {
        var self = this;
        self.fetched.ports_fetched = true;
        if (self.fetched.isAllFetched()) {
            self.render();
        }
    },
    render: function () {
        var self = this;
        var myData = {
            'servers': [],
            'networks': [],
            'ports': [],
            'routers': []
        };

        var currentTenantId = Cookies.get('currentTenantID');
        var isAdmin = Cookies.get('currentUserIsCloudAdmin') || 0;
        var serverList = null;
        var networkList = null;
        var routerList = null;
        var portList = null;

        serverList = this.serverList.where();
        if (serverList.length > 0) {
            serverList.forEach(function (server) {
                myData['servers'].push(server.attributes);
            }, this);
        }

        if (isAdmin === true) {
            networkList = this.networkList.where();
        } else {
            var cTenant = this.networkList.where({"tenantId": currentTenantId});
            var cExternal = this.networkList.where({"router:external": true});
            networkList = cTenant.concat(cExternal);
        }
        if (networkList.length > 0) {
            networkList.forEach(function (network) {

                var network_item = network.attributes;
                var subnets = [];
                network_item.subnets.forEach(function (subnet) {
                    var mySubnet = self.subnetList.get(subnet);
                    if (mySubnet !== undefined) {
                        subnets.push(mySubnet.attributes);
                    }
                });
                network_item.subnets = subnets;
                myData['networks'].push(network_item);
            }, this);
        }

        if (isAdmin === true) {
            routerList = this.routerList.where();
        } else {
            routerList = this.routerList.where({"tenantId": currentTenantId});
        }
        if (routerList.length > 0) {
            routerList.forEach(function (router) {
                myData['routers'].push(router.attributes);
            }, this);
        }

        if (isAdmin === true) {
            portList = this.portList.where();
        } else {
            portList = this.portList.where({"tenantId": currentTenantId});
        }
        if (portList.length > 0) {
            portList.forEach(function (port) {
                if (port.attributes.deviceOwner != 'network:router_ha_interface') {
                    myData['ports'].push(port.attributes);
                }
            }, this);
        }

        myData['ports'] = myData['ports'].concat(this.prepare_gateway_ports(myData['routers'], myData['ports']));
        this.doUpdateSurfaceFromData(myData);
        this.fetched.clearFetched();
    },

    doCollectDataFromApi: function () {
        var self = this;
        self.serverList.fetch();
        self.networkList.fetch();
        self.routerList.fetch();
        self.portList.fetch();
        self.subnetList.fetch();
    },

    initRender: function () {
        var self = this;
        //$(self.svg_container).spin(false);
        //if ($('#networktopology').length === 0) {
        //  return;
        //}
        self.create_vis();
        self.loading();
        self.data = {};
        self.data.networks = {};
        self.data.routers = {};
        self.data.servers = {};
        self.data.ports = {};

        // Setup balloon popups
        self.balloonTmpl = JST['popup_container'];
        self.balloon_portTmpl = JST['popup_port'];
        self.balloon_netTmpl = JST['popup_net'];
        self.balloon_instanceTmpl = JST['popup_instance'];

        $(document)
                .on('click', 'a.closeTopologyBalloon', function (e) {
                    e.preventDefault();
                    self.delete_balloon();
                })
                .on('click', '.topologyBalloon', function (e) {
                    e.stopPropagation();
                })
                .on('click', 'a.vnc_window', function (e) {
                    e.preventDefault();
                    var vncWindow = window.open($(this).attr('href'), vncWindow,
                            'width=760,height=560');
                    self.delete_balloon();
                });

        $(window).on('message', function (e) {
            var message = JSON.parse(e.originalEvent.data);
            if (self.previous_message !== message.message) {
                //horizon.alert(message.type, message.message);
                //horizon.autoDismissAlerts();
                self.previous_message = message.message;
                self.delete_post_message(message.iframe_id);
                if (message.type == 'success' && self.deleting_device) {
                    self.remove_node_on_delete();
                }
                self.retrieve_network_info();
                setTimeout(function () {
                    self.previous_message = null;
                }, 10000);
            }
        });

        //$('#topologyCanvasContainer').spin(false);
        self.force_direction(0.05, 70, -700);
        self.retrieve_network_info(true);
    },

    doUpdateSurfaceFromData: function (data) {
        var self = this;
        self.data_loaded = true;
        self.load_topology(data);
        if (self.forceStart) {
            var i = 0;
            self.force.start();
            while (i <= 100) {
                self.force.tick();
                i++;
            }
        }
        setTimeout(function () {
            self.retrieve_network_info();
        }, self.reload_duration);
    },
    // Get the json data about the current deployment
    retrieve_network_info: function (force_start) {
        var self = this;
        if (typeof (force_start) != "undefined")
        {
            self.forceStart = force_start;
        } else {
            self.forceStart = false;
        }
        self.doCollectDataFromApi();
    },

    // Load config from cookie
    load_config: function () {
        var labels = true;
        var networks = false;
        if (labels) {
            $('.nodeLabel').show();
        }
        if (networks) {
            for (var n in this.nodes) {
                if ({}.hasOwnProperty.call(this.nodes, n)) {
                    this.collapse_network(this.nodes[n], true);
                }
            }
        }
    },

    getScreenCoords: function (x, y) {
        var self = this;
        if (self.translate) {
            var xn = self.translate[0] + x * self.zoom.scale();
            var yn = self.translate[1] + y * self.zoom.scale();
            return {x: xn, y: yn};
        } else {
            return {x: x, y: y};
        }
    },

    // Setup the main visualisation
    create_vis: function () {
        var self = this;
        $('#topologyCanvasContainer').html('');

        // Main svg
        self.outer_group = d3.select('#topologyCanvasContainer').append('svg')
                .attr('width', '100%')
                .attr('height', $(document).height() + "px")
                .attr('pointer-events', 'all')
                .attr('style', 'height:' + $(document).height() + 'px') //for IE compatibility. svg height attribute not supported
                .append('g')
                .call(self.zoom
                        .scaleExtent([0.1, 1.5])
                        .on('zoom', function () {
                            self.delete_balloon();
                            self.vis.attr('transform', 'translate(' + d3.event.translate + ')scale(' +
                                    self.zoom.scale() + ')');
                            self.translate = d3.event.translate;
                        })
                        )
                .on('dblclick.zoom', null);

        // Background for capturing mouse events
        self.outer_group.append('rect')
                .attr('width', '100%')
                .attr('height', '100%')
                .attr('fill', 'white')
                .on('click', function (d) {
                    self.delete_balloon();
                });

        // svg wrapper for nodes to sit on
        self.vis = self.outer_group.append('g');
    },

    loading: function () {
        var self = this;
        var load_text = self.vis.append('text')
                .style('fill', 'black')
                .style('font-size', '40')
                .attr('x', '50%')
                .attr('y', '50%')
                .text('');
        var counter = 0;
        var timer = setInterval(function () {
            var i;
            var str = '';
            for (i = 0; i <= counter; i++) {
                str += '.';
            }
            load_text.text(str);
            if (counter >= 9) {
                counter = 0;
            } else {
                counter++;
            }
            if (self.data_loaded) {
                clearInterval(timer);
                load_text.remove();
            }
        }, 100);
    },

    // Calculate the hulls that surround networks
    convex_hulls: function (nodes) {
        var net, _i, _len, _ref, _h, i;
        var hulls = {};
        var networkids = {};
        var k = 0;
        var offset = 40;

        while (k < nodes.length) {
            var n = nodes[k];
            if (n.data !== undefined) {
                if (n.data instanceof Server) {
                    _ref = n.data.networks;
                    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                        net = _ref[_i];
                        if (net instanceof Network) {
                            _h = hulls[net.id] || (hulls[net.id] = []);
                            _h.push([n.x - offset, n.y - offset]);
                            _h.push([n.x - offset, n.y + offset]);
                            _h.push([n.x + offset, n.y - offset]);
                            _h.push([n.x + offset, n.y + offset]);
                        }
                    }
                } else if (n.data instanceof Network) {
                    net = n.data;
                    networkids[net.id] = n;
                    _h = hulls[net.id] || (hulls[net.id] = []);
                    _h.push([n.x - offset, n.y - offset]);
                    _h.push([n.x - offset, n.y + offset]);
                    _h.push([n.x + offset, n.y - offset]);
                    _h.push([n.x + offset, n.y + offset]);

                }
            }
            ++k;
        }
        var hullset = [];
        for (i in hulls) {
            if ({}.hasOwnProperty.call(hulls, i)) {
                hullset.push({group: i, network: networkids[i], path: d3.geom.hull(hulls[i])});
            }
        }

        return hullset;
    },

    // Setup the force direction
    force_direction: function (grav, dist, ch) {
        var self = this;

        $('[data-toggle="tooltip"]').tooltip({container: 'body'});
        self.curve = d3.svg.line()
                .interpolate('cardinal-closed')
                .tension(0.85);
        self.fill = d3.scale.category10();

        self.force = d3.layout.force()
                .gravity(grav)
                .linkDistance(function (d) {
                    if (d.source.data instanceof Server || d.target.data instanceof Server) {
                        if (d.source.data.networks) {
                            return (dist * d.source.data.networks.length) + (5 * d.target.data.instances) + 20;
                        } else if (d.target.data.networks) {
                            return (dist * d.target.data.networks.length) + (5 * d.source.data.instances) + 20;
                        }
                    } else if (d.source.data instanceof Router || d.target.data instanceof Router) {
                        if (d.source.data.networks) {
                            if (d.source.data.networks.length === 0) {
                                return dist + 20;
                            } else if (d.target.data.instances) {
                                return dist * d.source.data.networks.length + (10 * d.target.data.instances) + 20;
                            }
                            return dist * d.source.data.networks.length + 20;
                        } else if (d.target.data.networks) {
                            if (d.target.data.networks.length === 0) {
                                return dist + 20;
                            } else if (d.source.data.instances) {
                                return dist * d.target.data.networks.length + (10 * d.source.data.instances) + 20;
                            }
                            return dist * d.source.data.networks.length + 20;
                        }
                    } else {
                        return dist;
                    }
                })
                .charge(ch)
                .size([$('#topologyCanvasContainer').width(),
                    $('#topologyCanvasContainer').height()])
                .nodes(self.nodes)
                .links(self.links)
                .on('tick', function () {

                    // Somehow zoom event is been triggered on tick event too. For this 
                    // Overwrites $("#topologyCanvasContainer svg g")'s 
                    // transform attr to remove translate from itself and its
                    // childs 
//        self.vis
//          .attr('transform', function (d) {
//            return 'scale(' + self.zoom.scale() + ')';
//          });

                    // then adds transform attr to only 
                    // $("#topologyCanvasContainer svg g.node") elements
                    self.vis.selectAll('g.node')
                            .attr('transform', function (d) {
                                return 'translate(' + d.x + ',' + d.y + ')';
                            });

                    self.vis.selectAll('line.link')
                            .attr('x1', function (d) {
                                return d.source.x;
                            })
                            .attr('y1', function (d) {
                                return d.source.y;
                            })
                            .attr('x2', function (d) {
                                return d.target.x;
                            })
                            .attr('y2', function (d) {
                                return d.target.y;
                            });

                    self.vis.selectAll('path.hulls')
                            .data(self.convex_hulls(self.vis.selectAll('g.node').data()))
                            .attr('d', function (d) {
                                return self.curve(d.path);
                            })
                            .enter().insert('path', 'g')
                            .attr('class', 'hulls')
                            .style('fill', function (d) {
                                return self.fill(d.group);
                            })
                            .style('stroke', function (d) {
                                return self.fill(d.group);
                            })
                            .style('stroke-linejoin', 'round')
                            .style('stroke-width', 10)
                            .style('opacity', 0.2);
                });
    },

    // Create a new node
    new_node: function (data, x, y) {
        var self = this;
        data = {data: data};
        if (x && y) {
            data.x = x;
            data.y = y;
        }
        self.nodes.push(data);

        var node = self.vis.selectAll('g.node').data(self.nodes);
        var nodeEnter = node.enter().append('g')
                .attr('class', 'node')
                .style('fill', 'white')
                .on('click', function (d) {
                    console.log(this);
                })
                .call(self.force.drag);


        nodeEnter.append('circle')
                .attr('class', 'frame')
                .attr('r', function (d) {
                    switch (Object.getPrototypeOf(d.data)) {
                        case ExternalNetwork.prototype:
                            return 35;
                        case Network.prototype:
                            return 30;
                        case Router.prototype:
                            return 25;
                        case Server.prototype:
                            return 20;
                    }
                })
                .style('fill', 'white')
                .style('stroke', 'black')
                .style('stroke-width', 3);

        switch (data.data.iconType) {
            case 'text':
                nodeEnter.append('text')
                        .style('fill', 'black')
                        .style('font', '20px FontAwesome')
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'central')
                        .text(function (d) {
                            return d.data.icon;
                        })
                        .attr('transform', function (d) {
                            switch (Object.getPrototypeOf(d.data)) {
                                case ExternalNetwork.prototype:
                                    return 'scale(2.5)';
                                case Network.prototype:
                                    return 'scale(1.5)';
                                case Server.prototype:
                                    return 'scale(1)';
                            }
                        });
                break;
            case 'path':
                nodeEnter.append('path')
                        .attr('class', 'svgpath')
                        .style('fill', 'black')
                        .attr('d', function (d) {
                            return self.svgs(d.data.svg);
                        })
                        .attr('transform', function () {
                            return 'scale(1.2)translate(-16,-15)';
                        });
                break;
        }

        nodeEnter.append('text')
                .attr('class', 'nodeLabel')
                .style('display', function () {
                    var labels = true;
                    if (labels) {
                        return 'inline';
                    } else {
                        return 'none';
                    }
                })
                .style('fill', 'black')
                .text(function (d) {
                    return d.data.name;
                })
                .attr('transform', function (d) {
                    switch (Object.getPrototypeOf(d.data)) {
                        case ExternalNetwork.prototype:
                            return 'translate(40,3)';
                        case Network.prototype:
                            return 'translate(35,3)';
                        case Router.prototype:
                            return 'translate(30,3)';
                        case Server.prototype:
                            return 'translate(25,3)';
                    }
                });

        if (data.data instanceof Network || data.data instanceof ExternalNetwork) {
            nodeEnter.append('svg:text')
                    .attr('class', 'vmCount')
                    .style('fill', 'black')
                    .style('font-size', '20')
                    .text('')
                    .attr('transform', 'translate(26,38)');
        }
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            nodeEnter.on('touchend', function (d) {
                var now = new Date().getTime();
                var delta = now - d.data.lastTouch;
                if (delta > 20 && delta < 500) {
                    d.data.lastTouch = 0;
                    setTimeout(function () {
                        self.show_balloon(d.data, d, $(this));
                    }, 200);
                } else {
                    d.data.lastTouch = now;
                }
            });
        } else {
            nodeEnter.on('dblclick', function (d) {
                self.show_balloon(d.data, d, $(this));
            });

        }
        // Highlight the links for currently selected node
        nodeEnter.on('mouseover', function (d) {
            self.vis.selectAll('line.link').filter(function (z) {
                if (z.source === d || z.target === d) {
                    return true;
                } else {
                    return false;
                }
            }).style('stroke-width', '3px');
        });

        // Remove the highlight on the links
        nodeEnter.on('mouseout', function () {
            self.vis.selectAll('line.link').style('stroke-width', '1px');
        });
    },

    collapse_network: function (d, only_collapse) {
        var self = this;
        var server, vm;

        var filterNode = function (obj) {
            return function (d) {
                return obj == d.data;
            };
        };

        if (!d.data.collapsed) {
            var vmCount = 0;
            for (vm in self.data.servers) {
                if (self.data.servers[vm] !== undefined) {
                    if (self.data.servers[vm].networks.length == 1) {
                        if (self.data.servers[vm].networks[0].id == d.data.id) {
                            vmCount += 1;
                            self.removeNode(self.data.servers[vm]);
                        }
                    }
                }
            }
            d.data.collapsed = true;
            if (vmCount > 0) {
                self.vis.selectAll('.vmCount').filter(filterNode(d.data))[0][0].textContent = vmCount;
            }
        } else if (!only_collapse) {
            for (server in self.data.servers) {
                if ({}.hasOwnProperty.call(self.data.servers, server)) {
                    var _vm = self.data.servers[server];
                    if (_vm !== undefined) {
                        if (_vm.networks.length === 1) {
                            if (_vm.networks[0].id == d.data.id) {
                                self.new_node(_vm, d.x, d.y);
                                self.new_link(self.find_by_id(_vm.id), self.find_by_id(d.data.id));
                                self.force.start();
                            }
                        }
                    }
                }
            }
            d.data.collapsed = false;
            self.vis.selectAll('.vmCount').filter(filterNode(d.data))[0][0].textContent = '';
            var i = 0;
            while (i <= 100) {
                self.force.tick();
                i++;
            }
        }
    },

    new_link: function (source, target) {
        var self = this;
        self.links.push({source: source, target: target});
        var line = self.vis.selectAll('line.link').data(self.links);
        line.enter().insert('line', 'g.node')
                .attr('class', 'link')
                .attr('x1', function (d) {
                    return d.source.x;
                })
                .attr('y1', function (d) {
                    return d.source.y;
                })
                .attr('x2', function (d) {
                    return d.target.x;
                })
                .attr('y2', function (d) {
                    return d.target.y;
                })
                .style('stroke', 'black')
                .style('stroke-width', 2);
    },

    find_by_id: function (id) {
        var self = this;
        var obj, _i, _len, _ref;
        _ref = self.vis.selectAll('g.node').data();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            obj = _ref[_i];
            if (obj.data.id == id) {
                return obj;
            }
        }
        return undefined;
    },

    already_in_graph: function (data, node) {
        // Check for gateway that may not have unique id
        if (data == this.data.ports) {
            for (var p in data) {
                if (JSON.stringify(data[p]) == JSON.stringify(node)) {
                    return true;
                }
            }
            return false;
        }
        // All other node types have UUIDs
        for (var n in data) {
            if (n == node.id) {
                return true;
            }
        }
        return false;
    },

    load_topology: function (data) {
        var self = this;
        var net, _i, _netlen, _netref, rou, _j, _roulen, _rouref, port, _l, _portlen, _portref,
                ser, _k, _serlen, _serref, obj, vmCount;
        var change = false;
        var filterNode = function (obj) {
            return function (d) {
                return obj == d.data;
            };
        };

        // Networks
        _netref = data.networks;
        for (_i = 0, _netlen = _netref.length; _i < _netlen; _i++) {
            net = _netref[_i];
            var network = null;
            if (net['router:external'] === true) {
                network = new ExternalNetwork(net);
            } else {
                network = new Network(net);
            }

            if (!self.already_in_graph(self.data.networks, network)) {
                self.new_node(network);
                change = true;
            } else {
                obj = self.find_by_id(network.id);
                if (obj) {
                    network.collapsed = obj.data.collapsed;
                    network.instances = obj.data.instances;
                    obj.data = network;
                }
            }
            self.data.networks[network.id] = network;
        }

        // Routers
        _rouref = data.routers;
        for (_j = 0, _roulen = _rouref.length; _j < _roulen; _j++) {
            rou = _rouref[_j];
            var router = new Router(rou);
            if (!self.already_in_graph(self.data.routers, router)) {
                self.new_node(router);
                change = true;
            } else {
                obj = self.find_by_id(router.id);
                if (obj) {
                    // Keep networks list
                    router.networks = obj.data.networks;
                    // Keep ports list
                    router.ports = obj.data.ports;
                    obj.data = router;
                }
            }
            self.data.routers[router.id] = router;
        }

        // Servers
        _serref = data.servers;
        for (_k = 0, _serlen = _serref.length; _k < _serlen; _k++) {
            ser = _serref[_k];
            var server = new Server(ser);
            if (!self.already_in_graph(self.data.servers, server)) {
                self.new_node(server);
                change = true;
            } else {
                obj = self.find_by_id(server.id);
                if (obj) {
                    // Keep networks list
                    server.networks = obj.data.networks;
                    // Keep ip address list
                    server.ip_addresses = obj.data.ip_addresses;
                    obj.data = server;
                } else if (self.data.servers[server.id] !== undefined) {
                    // This is used when servers are hidden because the network is
                    // collapsed
                    server.networks = self.data.servers[server.id].networks;
                    server.ip_addresses = self.data.servers[server.id].ip_addresses;
                }
            }
            self.data.servers[server.id] = server;
        }

        // Ports
        _portref = data.ports;
        for (_l = 0, _portlen = _portref.length; _l < _portlen; _l++) {
            port = _portref[_l];
            if (!self.already_in_graph(self.data.ports, port)) {
                var device = self.find_by_id(port.deviceId);
                var _network = self.find_by_id(port.networkId);
                if ((typeof (device) != "undefined") && (typeof (_network) != "undefined")) {
                    if (port.deviceOwner == 'compute:nova' || port.deviceOwner == 'compute:None') {
                        _network.data.instances++;
                        device.data.networks.push(_network.data);
                        if (port.fixedIps) {
                            for (var ip in port.fixedIps) {
                                device.data.ip_addresses.push(port.fixedIps[ip]);
                            }
                        }
                        // Remove the recently added node if connected to a network which is
                        // currently collapsed
                        if (_network.data.collapsed) {
                            if (device.data.networks.length == 1) {
                                self.data.servers[device.data.id].networks = device.data.networks;
                                self.data.servers[device.data.id].ip_addresses = device.data.ip_addresses;
                                self.removeNode(self.data.servers[port.deviceId]);
                                vmCount = Number(self.vis.selectAll('.vmCount').filter(filterNode(_network.data))[0][0].textContent);
                                self.vis.selectAll('.vmCount').filter(filterNode(_network.data))[0][0].textContent = vmCount + 1;
                                continue;
                            }
                        }
                    } else if (port.deviceOwner == 'network:router_interface') {
                        device.data.networks.push(_network.data);
                        device.data.ports.push(port);
                    } else if (device.data.ports) {
                        device.data.ports.push(port);
                    }
                    self.new_link(self.find_by_id(port.deviceId), self.find_by_id(port.networkId));
                    change = true;
                } else if ((typeof (_network) != "undefined") && (port.deviceOwner == 'compute:nova')) {
                    // Need to add a previously hidden node to the graph because it is
                    // connected to more than 1 network
                    if (_network.data.collapsed) {
                        server = self.data.servers[port.deviceId];
                        server.networks.push(_network.data);
                        if (port.fixedIps) {
                            for (var ip in port.fixedIps) {
                                server.ip_addresses.push(port.fixedIps[ip]);
                            }
                        }
                        self.new_node(server);
                        // decrease collapsed vm count on network
                        vmCount = Number(self.vis.selectAll('.vmCount').filter(filterNode(server.networks[0]))[0][0].textContent);
                        if (vmCount == 1) {
                            self.vis.selectAll('.vmCount').filter(filterNode(server.networks[0]))[0][0].textContent = '';
                        } else {
                            self.vis.selectAll('.vmCount').filter(filterNode(server.networks[0]))[0][0].textContent = vmCount - 1;
                        }
                        // Add back in first network link
                        self.new_link(self.find_by_id(port.deviceId), self.find_by_id(server.networks[0].id));
                        // Add new link
                        self.new_link(self.find_by_id(port.deviceId), self.find_by_id(port.networkId));
                        change = true;
                    }
                }
            }
            self.data.ports[port.id + port.deviceId + port.networkId] = port;
        }
        if (change) {
            self.force.start();
        }
        self.load_config();
    },

    removeNode: function (obj) {
        var filterNetwork, filterNode, n, node, _i, _len, _ref;
        _ref = this.nodes;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            n = _ref[_i];
            if (n.data === obj) {
                node = n;
                break;
            }
        }
        if (node) {
            this.nodes.splice(this.nodes.indexOf(node), 1);
            filterNode = function (obj) {
                return function (d) {
                    return obj === d.data;
                };
            };
            filterNetwork = function (obj) {
                return function (d) {
                    return obj === d.network.data;
                };
            };
            if (obj instanceof Network) {
                this.vis.selectAll('.hulls').filter(filterNetwork(obj)).remove();
            }
            this.vis.selectAll('g.node').filter(filterNode(obj)).remove();
            return this.removeNodesLinks(obj);
        }
    },

    removeNodesLinks: function (node) {
        var l, linksToRemove, _i, _j, _len, _len1, _ref;
        linksToRemove = [];
        _ref = this.links;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            l = _ref[_i];
            if (l.source.data === node) {
                linksToRemove.push(l);
            } else if (l.target.data === node) {
                linksToRemove.push(l);
            }
        }
        for (_j = 0, _len1 = linksToRemove.length; _j < _len1; _j++) {
            l = linksToRemove[_j];
            this.removeLink(l);
        }
        return this.force.resume();
    },

    removeLink: function (link) {
        var i, index, l, _i, _len, _ref;
        index = -1;
        _ref = this.links;
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
            l = _ref[i];
            if (l === link) {
                index = i;
                break;
            }
        }
        if (index !== -1) {
            this.links.splice(index, 1);
        }
        return this.vis.selectAll('line.link').data(this.links).exit().remove();
    },

    delete_device: function (type, deviceId) {
        var self = this;
        var message = {id: deviceId};
        self.post_message(deviceId, type, message);
        self.deleting_device = {type: type, deviceId: deviceId};
    },

    remove_node_on_delete: function () {
        var self = this;
        var type = self.deleting_device.type;
        var deviceId = self.deleting_device.deviceId;
        switch (type) {
            case 'router':
                self.removeNode(self.data.routers[deviceId]);
                break;
            case 'instance':
                self.removeNode(self.data.servers[deviceId]);
                this.data.servers[deviceId] = undefined;
                break;
            case 'network':
                self.removeNode(self.data.networks[deviceId]);
                break;
        }
        self.delete_balloon();
    },

    delete_port: function (routerId, portId, networkId) {
        var self = this;
        var message = {id: portId};
        if (routerId) {
            self.post_message(portId, 'router/' + routerId + '/', message);
            for (var l in self.links) {
                var data = null;
                if (self.links[l].source.data.id == routerId && self.links[l].target.data.id == networkId) {
                    data = self.links[l].source.data;
                } else if (self.links[l].target.data.id == routerId && self.links[l].source.data.id == networkId) {
                    data = self.links[l].target.data;
                }

                if (data) {
                    for (var p in data.ports) {
                        if ((data.ports[p].id == portId) && (data.ports[p].networkId == networkId)) {
                            self.removeLink(self.links[l]);
                            // Update Router to remove deleted port
                            var router = self.find_by_id(routerId);
                            router.data.ports.splice(router.data.ports.indexOf(data.ports[p]), 1);
                            self.force.start();
                            return;
                        }
                    }
                }
            }
        } else {
            self.post_message(portId, 'network/' + networkId + '/', message);
        }
    },

    show_balloon: function (d, d2, element) {
        var self = this;
        var balloonTmpl = self.balloonTmpl;
        var portTmpl = self.balloon_portTmpl;
        var netTmpl = self.balloon_netTmpl;
        var instanceTmpl = self.balloon_instanceTmpl;
        var balloonID = 'bl_' + d.id;
        var ports = [];
        var subnets = [];
        if (self.balloonID) {
            if (self.balloonID == balloonID) {
                self.delete_balloon();
                return;
            }
            self.delete_balloon();
        }
        self.force.stop();
        if (d.hasOwnProperty('ports')) {
            d.ports.forEach(function (port) {
                var object = {};
                object.id = port.id;
                object.router_id = port.deviceId;
                object.url = port.url;
                object.port_status = (port.status === 'ACTIVE') ? 'ACTIVE' : 'DOWN';
                object.port_status_css = (port.status === 'ACTIVE') ? 'active' : 'down';
                var ipAddress = '';
                try {
                    for (var ip in port.fixedIps) {
                        ipAddress += port.fixedIps[ip].ip_address + ' ';
                    }
                } catch (e) {
                    ipAddress = gettext('None');
                }
                var deviceOwner = '';
                try {
                    deviceOwner = port.deviceOwner.replace('network:', '');
                } catch (e) {
                    deviceOwner = gettext('None');
                }
                var networkId = '';
                try {
                    networkId = port.networkId;
                } catch (e) {
                    networkId = gettext('None');
                }
                object.ip_address = ipAddress;
                object.device_owner = deviceOwner;
                object.network_id = networkId;
                object.is_interface = (deviceOwner === 'router_interface');
                ports.push(object);
            });
        } else if (d.hasOwnProperty('subnets')) {
            d.subnets.forEach(function (snet) {
                var object = {};
                object.id = snet.id;
                object.cidr = snet.cidr;
                object.ip_vesion = (snet.ipVersion === 6) ? 'ipv6' : 'ipv4';
                object.name = snet.name;
                object.gw_ip = snet.gatewayIp;
                subnets.push(object);
            });
        }
        var htmlData = {
            balloon_id: balloonID,
            id: d.id,
            url: d.url,
            name: d.name,
            type: d.type,
            type2Display: d.type2Display,
            delete_label: gettext('Delete'),
            type_label: gettext('TYPE'),
            status: d.status,
            status_class: (d.status === 'ACTIVE' || d.status === 'RUNNING') ? 'active' : 'down',
            status_label: gettext('STATUS'),
            id_label: gettext('ID'),
            interfaces_label: gettext('Interfaces'),
            subnets_label: gettext('Subnets'),
            delete_interface_label: gettext('Delete Interface'),
            delete_subnet_label: gettext('Delete Subnet'),
            open_console_label: gettext('Open Console'),
            view_details_label: gettext('View Details'),
            ips_label: gettext('IP Addresses')
        };
        var html;
        if (d instanceof Router) {
            htmlData.delete_label = gettext('Delete Router');
            htmlData.view_details_label = gettext('View Router Details');
            htmlData.port = ports;
            htmlData.add_interface_url = 'router/' + d.id + '/addinterface';
            htmlData.add_interface_label = gettext('Add Interface');
            htmlData.table2 = portTmpl(htmlData);
            html = balloonTmpl(htmlData);
        } else if (d instanceof Server) {
            htmlData.delete_label = gettext('Terminate Instance');
            htmlData.view_details_label = gettext('View Instance Details');
            htmlData.console_id = d.id;
            htmlData.ips = d.ip_addresses;
            htmlData.console = d.console;
            htmlData.table2 = instanceTmpl(htmlData);
            html = balloonTmpl(htmlData);
        } else if (d instanceof Network || d instanceof ExternalNetwork) {
            for (var s in subnets) {
                subnets[s].network_id = d.id;
            }
            htmlData.subnet = subnets;
            if (d instanceof Network) {
                htmlData.delete_label = gettext('Delete Network');
            }
            htmlData.add_subnet_url = 'network/' + d.id + '/subnet/create';
            htmlData.add_subnet_label = gettext('Create Subnet');
            htmlData.table2 = netTmpl(htmlData);
            html = balloonTmpl(htmlData);
        } else {
            return;
        }
        $(self.svg_container).append(html);
        var devicePosition = self.getScreenCoords(d2.x, d2.y);
        var x = devicePosition.x;
        var y = devicePosition.y;
        var xoffset = 30;
        var yoffset = 25;
        $('#' + balloonID).css({
            'left': x + xoffset + 'px',
            'top': y + yoffset + 'px'
        }).show();
        var _balloon = $('#' + balloonID);
        if (element.x + _balloon.outerWidth() > $(window).outerWidth()) {
            _balloon
                    .css({
                        'left': 0 + 'px'
                    })
                    .css({
                        'left': (x - _balloon.outerWidth() + 'px')
                    })
                    .addClass('leftPosition');
        }
        _balloon.find('.delete-device').click(function () {
            var _this = $(this);
            _this.prop('disabled', true);
            d3.select('#id_' + _this.data('device-id')).classed('loading', true);
            self.delete_device(_this.data('type'), _this.data('device-id'));
        });
        _balloon.find('.delete-port').click(function () {
            var _this = $(this);
            self.delete_port(_this.data('router-id'), _this.data('port-id'), _this.data('network-id'));
            self.delete_balloon();
        });
        self.balloonID = balloonID;
    },

    delete_balloon: function () {
        var self = this;
        if (self.balloonID) {
            $('#' + self.balloonID).remove();
            self.balloonID = null;
            self.force.start();
        }

    },

    svgs: function (name) {
        switch (name) {
            case 'router':
                return 'm 26.628571,16.08 -8.548572,0 0,8.548571 2.08,-2.079998 6.308572,6.30857 4.38857,-4.388572 -6.308571,-6.30857 z m -21.2571429,-4.159999 8.5485709,0 0,-8.5485723 -2.08,2.08 L 5.5314281,-0.85714307 1.1428571,3.5314287 7.4514281,9.84 z m -3.108571,7.268571 0,8.548571 8.5485709,0 L 8.7314281,25.657144 15.039999,19.325715 10.674285,14.96 4.3428571,21.268573 z M 29.737142,8.8114288 l 0,-8.54857147 -8.548572,0 2.08,2.07999987 -6.308571,6.3085716 4.388572,4.3885722 6.308571,-6.3085723 z';
            default:
                return '';
        }
    },

    post_message: function (id, url, message) {
        var self = this;
        var iframeID = 'ifr_' + id;
        var iframe = $('<iframe width="500" height="300" />')
                .attr('id', iframeID)
                .attr('src', url)
                .appendTo(self.post_messages);
        iframe.on('load', function () {
            $(this).get(0).contentWindow.postMessage(
                    JSON.stringify(message, null, 2), '*');
        });
    },
    delete_post_message: function (id) {
        $('#' + id).remove();
    }
});


var networkTopology = new TopologyView();
