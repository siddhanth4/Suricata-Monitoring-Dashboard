# Ubuntu VM Setup — Suricata, SSH Log Access, and Dashboard Integration

This guide documents the lab setup used by Suricata SOC Monitor: Suricata runs on Ubuntu, Kali generates authorized test traffic, and the Node.js dashboard backend runs on Windows and reads the remote EVE log over SSH.

## 1. Lab topology and known addresses

Verify these values in your own VM before using commands:

| Machine | Example address | Interface / role |
|---|---|---|
| Ubuntu Suricata sensor | `192.168.194.132` | `ens33` |
| Kali test VM | `192.168.194.129` | `eth0` |
| Windows host | varies | Runs VS Code, Node.js backend and browser |

On Ubuntu:

```bash
ip -brief address show
hostname -I
ip route
```

On Kali:

```bash
ip -brief address show
ip route
```

Both VMs must have a network path between them. Use only an isolated, authorized lab.

## 2. Install and verify Suricata

If Suricata is already installed, do not reinstall it just to follow this guide.

```bash
sudo apt update
sudo apt install -y suricata jq curl
suricata --build-info
sudo systemctl status suricata --no-pager -l
```

If installing from the OISF stable PPA is appropriate for your Ubuntu release:

```bash
sudo add-apt-repository ppa:oisf/suricata-stable -y
sudo apt update
sudo apt install -y suricata jq curl
```

The lab currently uses Suricata **8.0.3**. Verify your installed version rather than assuming a package command installed that exact version.

## 3. Identify the configuration, rules and logs

Known paths:

```text
Main service config: /etc/suricata/suricata.yaml
Candidate AF-PACKET IDS config: /etc/suricata/suricata.yaml.pre-nfq-ips
Existing rules: /var/lib/suricata/rules/local.rules
EVE JSON: /var/log/suricata/eve.json
Human-readable alerts: /var/log/suricata/fast.log
```

Inspect the service's effective command and override:

```bash
sudo systemctl show suricata -p ExecStart
sudo systemctl cat suricata
ps -eo pid,args | grep '[s]uricata'
```

In this lab, the normal service uses `-q 0` (NFQUEUE IPS). The candidate config is intended for the foreground AF-PACKET IDS demo, but validate it before use:

```bash
sudo suricata -T -c /etc/suricata/suricata.yaml.pre-nfq-ips
sudo sed -n '650,710p' /etc/suricata/suricata.yaml.pre-nfq-ips
sudo sed -n '2295,2330p' /etc/suricata/suricata.yaml.pre-nfq-ips
```

Confirm the interface is `ens33`, the intended rule path is configured, and validation succeeds. Do not assume a backup file is correct simply because of its filename.

## 4. Verify EVE JSON output

Inspect the `outputs` section of the active YAML configuration:

```bash
sudo grep -n -A45 '^[[:space:]]*outputs:' /etc/suricata/suricata.yaml
```

The configuration should have an enabled `eve-log` output writing `eve.json` under Suricata's log directory and include the event types needed by the dashboard, especially `alert`. Do not replace the entire `outputs` section with a generic example: preserve the rest of your existing configuration and validate changes with `suricata -T`.

Check that the files are receiving events:

```bash
sudo tail -n 5 /var/log/suricata/eve.json
sudo tail -n 20 /var/log/suricata/fast.log
```

## 5. Create a dedicated SSH key on Windows

The dashboard backend runs on Windows and connects to Ubuntu over SSH. Generate a dedicated key rather than reusing a personal key.

Open PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.ssh" | Out-Null
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\suricata_dashboard" -C "suricata-dashboard-readonly"
```

Files created:

- Private key: `%USERPROFILE%\.ssh\suricata_dashboard` — secret; never upload it.
- Public key: `%USERPROFILE%\.ssh\suricata_dashboard.pub` — install this on Ubuntu.

If you use a passphrase, make sure the SSH library in the Node backend can use it safely (for example, through a supported SSH agent). Never place the private key or passphrase in Git.

## 6. Add the public key to Ubuntu

From PowerShell, replace the username and IP:

```powershell
Get-Content "$env:USERPROFILE\.ssh\suricata_dashboard.pub" |
  ssh YOUR_UBUNTU_USERNAME@192.168.194.132 "umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys; chmod 700 ~/.ssh; chmod 600 ~/.ssh/authorized_keys"
```

If password authentication is unavailable, use an existing authorized method to add the public key to the Ubuntu user's `~/.ssh/authorized_keys`. Do not copy the private key to Ubuntu.

Test key-based login:

```powershell
ssh -i "$env:USERPROFILE\.ssh\suricata_dashboard" YOUR_UBUNTU_USERNAME@192.168.194.132
```

Verify the remote file can be read:

```powershell
ssh -i "$env:USERPROFILE\.ssh\suricata_dashboard" YOUR_UBUNTU_USERNAME@192.168.194.132 "tail -n 2 /var/log/suricata/eve.json"
```

If permission is denied, inspect permissions on Ubuntu:

```bash
ls -l /var/log/suricata/eve.json
namei -l /var/log/suricata/eve.json
id YOUR_UBUNTU_USERNAME
```

Use a least-privilege, read-only solution. Avoid `chmod 644` on sensitive logs as a default fix, and do not run the entire Node backend as root. If you choose group-based access, confirm both the directory and file allow read/traverse access and start a new login session after changing group membership.

## 7. Configure the dashboard `.env` on Windows

In the root of the cloned repository, create `.env` (or copy `.env.example` if present):

```dotenv
SURICATA_SSH_HOST=192.168.194.132
SURICATA_SSH_USER=YOUR_UBUNTU_USERNAME
SURICATA_SSH_KEY_PATH=C:/Users/YOUR_WINDOWS_USERNAME/.ssh/suricata_dashboard
SURICATA_EVE_PATH=/var/log/suricata/eve.json
DEMO_MODE=false
```

- `SURICATA_SSH_HOST`: Ubuntu VM IP or resolvable hostname.
- `SURICATA_SSH_USER`: Ubuntu account used for SSH.
- `SURICATA_SSH_KEY_PATH`: absolute **Windows private-key path**, not the `.pub` file.
- `SURICATA_EVE_PATH`: absolute path to EVE JSON on Ubuntu.
- `DEMO_MODE=false`: use the live data path; check source code for the precise behavior of demo mode.

Forward slashes in the Windows key path are recommended. Do not add `MONGODB_URI`: MongoDB is not part of the described setup. Ensure `.env` is listed in `.gitignore` and never commit real host credentials or private keys.

## 8. Run the dashboard in VS Code

From PowerShell in VS Code:

```powershell
git clone https://github.com/siddhanth4/Suricata-Monitoring-Dashboard.git
cd Suricata-Monitoring-Dashboard
npm install
```

If you have already cloned the repository, just `cd` into its root and run `npm install` when dependencies need to be installed. Check the scripts available in `package.json`; if `dev` is defined:

```powershell
npm run dev
```

Open the URL printed by the app in the Windows browser. The dashboard's backend reads EVE JSON over SSH; the browser receives events from the backend via Socket.IO. The browser does not connect directly to Ubuntu.

## 9. IDS mode demo — AF-PACKET

First validate the candidate configuration and inspect the interface/rule path (see Section 3). Then on Ubuntu:

```bash
sudo systemctl stop suricata
sudo systemctl status suricata --no-pager
sudo iptables -vnL INPUT
sudo iptables -vnL OUTPUT
```

Confirm the service stopped and the service-managed NFQUEUE rules were removed. Keep the dashboard backend running on Windows.

Start foreground IDS:

```bash
sudo suricata --af-packet -c /etc/suricata/suricata.yaml.pre-nfq-ips
```

Keep the terminal open. Generate test traffic from Kali and watch the dashboard plus logs:

```bash
sudo tail -f /var/log/suricata/fast.log
```

In another Ubuntu terminal, EVE events can be watched with:

```bash
sudo tail -f /var/log/suricata/eve.json
```

Stop the foreground Suricata process with `Ctrl+C` before starting the service again. Do not run both modes at once.

## 10. IPS mode demo — NFQUEUE

After the foreground IDS process is stopped with `Ctrl+C`:

```bash
sudo systemctl start suricata
sudo systemctl status suricata --no-pager -l
ps -eo pid,args | grep '[s]uricata'
sudo iptables -vnL INPUT
sudo iptables -vnL OUTPUT
```

Confirm the normal service uses `/etc/suricata/suricata.yaml` with `-q 0` and that its scoped queue rules are present. In the current lab the queue rules target TCP port `8080` between Kali `192.168.194.129` and Ubuntu `192.168.194.132`; they do not imply that port 21, port 22 or ICMP is inline-blocked.

If the existing local HTTP test server is needed, run on Ubuntu in a separate terminal:

```bash
python3 -m http.server 8080 --bind 192.168.194.132 --directory ~/suricata-ips-lab/empty
```

From Kali, test the existing rules:

```bash
curl --max-time 5 -X POST --data-binary 'system("test")' http://192.168.194.132:8080/
curl --max-time 5 'http://192.168.194.132:8080/?q=OR%201=1'
```

Check `fast.log` and EVE JSON for the matching SID and inspect `verdict.action` when present. A timeout alone is not proof of a block. The test request must traverse the queue and match a loaded `drop` or `reject` rule.

## 11. Quick verification commands

```bash
# Ubuntu: service / process
sudo systemctl status suricata --no-pager -l
ps -eo pid,args | grep '[s]uricata'

# Ubuntu: logs
sudo tail -f /var/log/suricata/fast.log
sudo tail -f /var/log/suricata/eve.json

# Ubuntu: rule/config validation
sudo suricata -T -c /etc/suricata/suricata.yaml
sudo suricata -T -c /etc/suricata/suricata.yaml.pre-nfq-ips

# Ubuntu: check FTP SYN-threshold alert SID
sudo grep '1000007' /var/log/suricata/fast.log
sudo jq -c 'select(.event_type=="alert" and .alert.signature_id==1000007)' /var/log/suricata/eve.json

# Windows: verify SSH and remote log read
ssh -i "$env:USERPROFILE\.ssh\suricata_dashboard" YOUR_UBUNTU_USERNAME@192.168.194.132 "tail -n 2 /var/log/suricata/eve.json"
```

## 12. Troubleshooting

- **SSH timeout:** check VM network mode, Ubuntu IP, SSH service and firewall.
- **Permission denied:** check the SSH username, public key installation and file/directory read permissions.
- **No dashboard events:** confirm `DEMO_MODE=false`, the `.env` values, backend terminal output, remote file path, Suricata event generation and Socket.IO connection.
- **No alert for a rule:** confirm the rule is loaded in the active mode, `$HOME_NET` is correct, the right interface is monitored, and the generated traffic matches the rule conditions.
- **IPS does not block:** confirm `-q 0`, queue rules and counters, test traffic scope, loaded rule action, and EVE verdict. Not all packets are queued.
- **Duplicate alert rows:** compare `eve.json` and `fast.log` with the dashboard. If the raw files contain two events, they may be two genuine Suricata events; if only one raw event exists, investigate backend replay/reconnect handling or frontend insertion logic.
