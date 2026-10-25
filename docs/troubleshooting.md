# Suricata SOC Monitor: Troubleshooting Guide

This guide covers common issues encountered when integrating Suricata on an Ubuntu virtual machine with the Node.js SOC dashboard.

---

## 1. File Permission Errors (`EACCES: permission denied, open '/var/log/suricata/eve.json'`)

### Cause
By default, `/var/log/suricata` is owned by `root:root` with restricted `0700` or `0750` permissions. If the Node.js service is run as an unprivileged user, it cannot open `eve.json`.

### Solution
Grant read permissions to the directory and log file without elevating the Node.js process to root:

```bash
# Allow read/execute traversal on the log directory
sudo chmod 755 /var/log/suricata

# Ensure eve.json is readable
sudo chmod 644 /var/log/suricata/eve.json
```

To make this permanent across reboots, edit `/etc/suricata/suricata.yaml` and set the file mode:
```yaml
outputs:
  - eve-log:
      enabled: yes
      filemode: "0644"
```

---

## 2. MongoDB Connectivity (`MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`)

### Cause
The MongoDB daemon (`mongod`) is not running on the local system.

### Solution
1. **Built-in Resilience**: Suricata SOC Monitor includes a resilient embedded storage engine. Even if MongoDB is stopped, the application functions continuously without crashing, caching up to 5,000 security events with full filtering and aggregation support.
2. **Starting MongoDB**:
```bash
sudo systemctl status mongod
sudo systemctl start mongod
sudo systemctl enable mongod
```
Once `mongod` is online, the database service automatically reconnects.

---

## 3. Suricata Runs But No Events Appear in `eve.json`

### Check 1: Hardware Checksum Offloading
In VMware or VirtualBox, NIC hardware offloading (LRO/GRO) can assemble packets into large buffers before Suricata inspects them, causing rule signature mismatches.

Disable hardware offloading on your sniffing interface:
```bash
sudo ethtool -K <YOUR_INTERFACE> rx off tx off sg off tso off gso off gro off lro off
```

### Check 2: Promiscuous Mode
Ensure the interface is listening in promiscuous mode:
```bash
sudo ip link set <YOUR_INTERFACE> promisc on
```

### Check 3: Rule Updates
Ensure Emerging Threats rules are downloaded:
```bash
sudo suricata-update
sudo systemctl restart suricata
```

---

## 4. Socket.IO Disconnections / Reconnection Loops

### Cause
Mismatched CORS origin or reverse proxy stripping WebSocket upgrade headers.

### Solution
Verify your `.env` contains:
```env
CLIENT_ORIGIN="http://localhost:3000"
```
If using Nginx as a reverse proxy:
```nginx
location /socket.io/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
}
```

---

## 5. Log Rotation Handling

When Ubuntu's `logrotate` rotates `/var/log/suricata/eve.json`, Suricata reopens a new file.

The `SuricataReader` service automatically detects when:
1. File size shrinks (`stat.size < currentOffset`)
2. Inode changes (`stat.ino !== currentInode`)

When this occurs, `SuricataReader` logs:
```
[SuricataReader] Log rotation detected! Resetting read position from 0.
```
and seamlessly begins tailing the fresh file.
