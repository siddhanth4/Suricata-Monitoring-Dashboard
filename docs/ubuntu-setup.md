# Ubuntu VM Deployment & Suricata IDS/IPS Setup

This guide provides reproducible instructions for deploying Suricata on an Ubuntu virtual machine and connecting it to the Suricata SOC Monitor backend.

---

## 1. Prerequisites

- **Host Machine**: Ubuntu 22.04 LTS or 24.04 LTS (VMware Workstation, VirtualBox, or Bare Metal)
- **Node.js**: v18+ or v20+ LTS
- **MongoDB**: v6.0+ or v7.0+ (Optional: Embedded storage automatically activates if MongoDB is absent)
- **Suricata**: v7.0+

---

## 2. Step 1: Install Suricata & Community Rules

Install the latest stable Suricata package:

```bash
sudo add-apt-repository ppa:oisf/suricata-stable -y
sudo apt update
sudo apt install -y suricata jq curl git

# Update detection signatures (Emerging Threats Open ruleset)
sudo suricata-update
```

Verify the installation:
```bash
suricata --build-info
```

---

## 3. Step 2: Identify Your Network Interface

**Important**: Do NOT assume your interface is named `eth0`. Modern Ubuntu distributions use predictable network interface names (e.g., `ens33`, `enp0s3`, `enp3s0`).

Run:
```bash
ip -brief address show
```
Or:
```bash
ip link show
```

Note the interface with your active IP subnet (e.g., `ens33`).

---

## 4. Step 3: Configure EVE JSON Output in `suricata.yaml`

Edit the main Suricata configuration file:
```bash
sudo nano /etc/suricata/suricata.yaml
```

Ensure `eve-log` is enabled and configured to output to `/var/log/suricata/eve.json`:

```yaml
outputs:
  - eve-log:
      enabled: yes
      filetype: regular
      filename: eve.json
      types:
        - alert:
            payload: yes
            payload-buffer-size: 4kb
            packet: yes
            metadata: yes
            tagged-packets: yes
        - flow
        - http
        - dns
        - tls
        - ssh
        - stats:
            interval: 30sec
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## 5. Step 4: Configure Safe Non-Root Permissions for Node.js

**Critical Security Rule**: Never run the Node.js web server or backend as `root` solely to read `/var/log/suricata/eve.json`.

Instead, grant your regular user read permissions to the Suricata log directory:

```bash
# Set directory permissions so non-root users can read log files
sudo chmod 755 /var/log/suricata

# Ensure eve.json has read permissions
sudo touch /var/log/suricata/eve.json
sudo chmod 644 /var/log/suricata/eve.json

# Add your user to the suricata group (if applicable)
sudo usermod -a -G suricata $USER
```

---

## 6. Step 5: Start Suricata

### A. Passive IDS Mode (Sniffer)
To run Suricata in passive detection mode on your interface:

```bash
sudo suricata -c /etc/suricata/suricata.yaml -i <YOUR_INTERFACE> -D
```
*(Replace `<YOUR_INTERFACE>` with `ens33` or your interface name).*

### B. Active Inline IPS Mode (Drop Enforcement)
To enable active inline drop enforcement via NFQUEUE:
```bash
# Direct iptables traffic into NFQUEUE 0
sudo iptables -I INPUT -j NFQUEUE --queue-num 0
sudo iptables -I OUTPUT -j NFQUEUE --queue-num 0

# Run Suricata in IPS queue mode
sudo suricata -q 0 -c /etc/suricata/suricata.yaml -D
```

---

## 7. Step 6: Start the Suricata SOC Monitor

Clone the repository and set up environment variables:

```bash
cd suricata-soc-dashboard
cp .env.example .env
```

Verify your `.env` contains:
```env
PORT=3000
MONGODB_URI="mongodb://127.0.0.1:27017/suricata_soc"
SURICATA_EVE_PATH="/var/log/suricata/eve.json"
```

Start the application:
```bash
npm run dev
```

Open `http://localhost:3000` in your browser. The SOC monitor will immediately begin streaming live events from `/var/log/suricata/eve.json`.
