document.addEventListener('DOMContentLoaded', () => {

  // --- 1. Header Scroll & Active Section Watcher ---
  const header = document.getElementById('header');
  const navLinks = document.querySelectorAll('nav ul li a');
  const sections = document.querySelectorAll('section');

  window.addEventListener('scroll', () => {
    // Header background change on scroll
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Active link highlighting
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (window.scrollY >= (sectionTop - 150)) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

  // --- 2. Mobile Nav Menu Toggle ---
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');

  menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('open');
    menuToggle.classList.toggle('active');
    
    // Burger animation
    const spans = menuToggle.querySelectorAll('span');
    if (navMenu.classList.contains('open')) {
      spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans[0].style.transform = 'none';
      spans[1].style.opacity = '1';
      spans[2].style.transform = 'none';
    }
  });

  // Close menu when link is clicked
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      const spans = menuToggle.querySelectorAll('span');
      spans[0].style.transform = 'none';
      spans[1].style.opacity = '1';
      spans[2].style.transform = 'none';
    });
  });


  // --- 3. Typewriter Effect ---
  const words = [
    "Building automated delivery pipelines.",
    "Provisioning Infrastructure as Code.",
    "Orchestrating containers on Kubernetes.",
    "Securing workflows (DevSecOps).",
    "Managing enterprise Linux systems."
  ];
  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  const typewriterElement = document.getElementById('typewriter');

  function type() {
    const currentWord = words[wordIndex];
    
    if (isDeleting) {
      typewriterElement.textContent = currentWord.substring(0, charIndex - 1);
      charIndex--;
    } else {
      typewriterElement.textContent = currentWord.substring(0, charIndex + 1);
      charIndex++;
    }

    let typeSpeed = 80;
    if (isDeleting) {
      typeSpeed = 40;
    }

    if (!isDeleting && charIndex === currentWord.length) {
      // Pause at full word
      typeSpeed = 2000;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      typeSpeed = 500;
    }

    setTimeout(type, typeSpeed);
  }

  type();


  // --- 4. Skill Progress Bar Trigger on Scroll ---
  const skillsSection = document.getElementById('skills');
  const skillBars = document.querySelectorAll('.skill-bar-progress');

  const animateSkills = () => {
    skillBars.forEach(bar => {
      const width = bar.getAttribute('data-width');
      bar.style.width = width;
    });
  };

  const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateSkills();
        skillObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  if (skillsSection) {
    skillObserver.observe(skillsSection);
  }


  // --- 5. Interactive CI/CD Pipeline Simulator ---
  const stages = document.querySelectorAll('.pipeline-stage');
  const panels = document.querySelectorAll('.pipeline-panel');
  const pipelineProgress = document.getElementById('pipeline-progress');

  const logData = {
    commit: [
      "[11:55:01] INFO Triggered by commit: update core layout",
      "[11:55:02] INFO Initializing runner environment...",
      "[11:55:04] CMD git checkout origin/main",
      "[11:55:05] SUCCESS Code checked out (v1.4.2)",
      "[11:55:06] CMD yamllint .github/workflows/*.yml",
      "[11:55:07] SUCCESS Validation checks passed!"
    ],
    build: [
      "[11:55:10] INFO Docker image build initiated...",
      "[11:55:12] CMD docker build -t backend:latest .",
      "[11:55:14] STEP 1/5: FROM node:18-alpine",
      "[11:55:16] STEP 2/5: WORKDIR /usr/src/app",
      "[11:55:18] STEP 3/5: COPY package*.json ./",
      "[11:55:20] STEP 4/5: RUN npm install --omit=dev",
      "[11:55:23] STEP 5/5: COPY . .",
      "[11:55:25] SUCCESS Successfully built image sha256:3c84dfae",
      "[11:55:26] CMD docker push hub.docker.com/raza/backend:v1.4.2",
      "[11:55:28] SUCCESS Image pushed successfully to registry"
    ],
    security: [
      "[11:55:31] INFO Running security compliance scan...",
      "[11:55:33] CMD gitleaks detect --source=.",
      "[11:55:34] SUCCESS Gitleaks: No secret leaks detected.",
      "[11:55:35] CMD bandit -r ./src -f json",
      "[11:55:37] SUCCESS Bandit: SAST audit completed, 0 high issues.",
      "[11:55:38] CMD trivy image raza/backend:v1.4.2",
      "[11:55:40] WARN Trivy: 0 critical, 3 medium, 6 low vulnerabilities found.",
      "[11:55:41] SUCCESS Security gateway status: APPROVED"
    ],
    deploy: [
      "[11:55:44] INFO Initiating deployment via IaC...",
      "[11:55:45] CMD terraform apply -auto-approve",
      "[11:55:47] SUCCESS Cloud resources updated. 0 added, 0 changed, 0 destroyed.",
      "[11:55:48] CMD kubectl apply -k ./kubernetes/overlays/production",
      "[11:55:50] INFO Deployment 'backend' rolling update trigger...",
      "[11:55:52] INFO Checking Kubernetes pod status...",
      "[11:55:54] SUCCESS Pod: backend-6fd7f47-a8b2 Ready (1/1)",
      "[11:55:55] SUCCESS Pod: backend-6fd7f47-b9c4 Ready (1/1)",
      "[11:55:56] SUCCESS Application live at: https://cloaknote.online"
    ]
  };

  function updatePipelineProgress(activeIndex) {
    const totalStages = stages.length;
    // Map stage index to percentage width
    // 0 -> 0%, 1 -> 33%, 2 -> 66%, 3 -> 100%
    const progressPercent = (activeIndex / (totalStages - 1)) * 84; // Align with layout margins
    pipelineProgress.style.width = `${progressPercent}%`;
  }

  function simulateLogs(stageName, logsBodyElement) {
    logsBodyElement.innerHTML = '';
    const lines = logData[stageName];
    
    lines.forEach((line, index) => {
      setTimeout(() => {
        const logLine = document.createElement('div');
        logLine.className = 'log-line';
        logLine.style.animation = 'fadeIn 0.2s ease forwards';
        
        // Extract timestamp, level, content
        const parts = line.match(/^\[(.*?)\]\s+(INFO|CMD|SUCCESS|WARN|STEP)\s+(.*)$/) || [null, '', '', line];
        const timestamp = parts[1] || '11:55:00';
        const level = parts[2];
        const content = parts[3];

        let contentClass = '';
        if (level === 'SUCCESS') contentClass = 'success';
        else if (level === 'WARN') contentClass = 'warning';
        else if (level === 'CMD') contentClass = 'info';

        logLine.innerHTML = `
          <span class="timestamp">[${timestamp}]</span>
          <span class="content ${contentClass}">${level ? `[${level}] ` : ''}${content}</span>
        `;
        logsBodyElement.appendChild(logLine);
        logsBodyElement.scrollTop = logsBodyElement.scrollHeight;
      }, index * 250); // Speed of typing log output
    });
  }

  stages.forEach((stage, index) => {
    stage.addEventListener('click', () => {
      const stageName = stage.getAttribute('data-stage');
      
      // Update stage active styles
      stages.forEach((s, idx) => {
        if (idx <= index) {
          s.classList.add('completed');
          s.classList.remove('active');
        } else {
          s.classList.remove('completed', 'active');
        }
      });
      stage.classList.add('active');
      stage.classList.remove('completed');

      // Update progress bar
      updatePipelineProgress(index);

      // Toggle info panel
      panels.forEach(panel => {
        panel.classList.remove('active');
      });
      const activePanel = document.getElementById(`panel-${stageName}`);
      activePanel.classList.add('active');

      // Trigger logs simulator
      const logsBody = activePanel.querySelector('.logs-body');
      simulateLogs(stageName, logsBody);
    });
  });

  // Pre-trigger log simulation for Commit on load
  const firstLogsBody = document.getElementById('logs-commit');
  if (firstLogsBody) {
    simulateLogs('commit', firstLogsBody);
  }


  // --- 6. Interactive Command Terminal ---
  const terminalInput = document.getElementById('terminal-input');
  const terminalOutput = document.getElementById('terminal-output');
  const terminalWindow = document.getElementById('terminal-window');
  const terminalPromptPrefix = document.getElementById('terminal-prompt-prefix');

  // Focus terminal input when clicking terminal window
  terminalWindow.addEventListener('click', () => {
    terminalInput.focus();
  });

  let currentDir = '~';

  const files = {
    '~': {
      'about.txt': `Ali Ahmad Raza - Senior Analyst / DevOps Automation Engineer
Results-driven DevOps Engineer with 4+ years of IT experience, specializing in Linux Administration, AWS Cloud, IaC, and CI/CD pipelines.
Currently working at HCL Tech executing DevOps orchestration.`,
      'skills.txt': `Tools & Tech Stack:
  - Scripting: Shell
  - IaC: Terraform
  - Config Mgmt: Ansible
  - Containers: Docker, Kubernetes
  - CI/CD Tool: GitHub Actions
  - Cloud: AWS Cloud Platform
  - Security: Bandit, Trivy, Gitleaks
  - Ticketing: Jira, ServiceNow`,
      'resume-pdf.lnk': `Shortcut link: Ali-Devops-23june.pdf
Download the official PDF resume from the header action or contact block.`,
      'projects': { type: 'dir' }
    },
    '~/projects': {
      'cloaknote.txt': `Project: Cloaknote.online (Secure Note Sharing Platform)
Duration: Jan 2026 – Mar 2026
Key Achievements:
- Developed and deployed a containerized multi-tier web app using Docker and Kubernetes.
- Implemented CI/CD pipeline with GitHub Actions for automated build and deployment.
- Applied DevSecOps SAST scanning (Bandit, safety, Trivy, Gitleaks).
- Configured Kubernetes Deployments, Services, Scaling and Self-healing.`,
      'terraform-vpc.txt': `Project: Infrastructure-As-Code VPC Blueprint
Description:
An enterprise-ready AWS VPC infrastructure baseline module template written in Terraform.
- Multi-AZ public/private subnets and route alignments.
- Integrated NAT and internet gateway associations.
- Modulized components to ensure reuse across environments.`
    }
  };

  terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const fullInput = terminalInput.value.trim();
      const inputParts = fullInput.split(/\s+/);
      const command = inputParts[0].toLowerCase();
      const args = inputParts.slice(1);

      // Print input line in terminal output
      const inputLine = document.createElement('div');
      inputLine.className = 'terminal-line';
      inputLine.innerHTML = `<span class="terminal-prompt-prefix">guest@raza-devops:${currentDir}$</span> <span style="color: #fff;">${fullInput}</span>`;
      terminalOutput.appendChild(inputLine);

      if (command) {
        let response = '';

        switch (command) {
          case 'help':
            response = `
Available commands:
  <span class="success">ls</span>             - List files and directories
  <span class="success">cd [dir]</span>       - Change directory (e.g. 'cd projects', 'cd ..')
  <span class="success">cat [file]</span>     - Display file contents (e.g. 'cat about.txt')
  <span class="success">pwd</span>            - Print current working directory
  <span class="success">neofetch</span>       - Display system information profile
  <span class="success">uname -a</span>       - Print kernel architecture details
  <span class="success">whoami</span>         - Display current logged-in user
  <span class="success">date</span>           - Display system date and time
  <span class="success">echo [text]</span>    - Echo text to screen
  <span class="success">clear</span>          - Clear terminal screen
            `;
            break;

          case 'clear':
            terminalOutput.innerHTML = '';
            break;

          case 'pwd':
            if (currentDir === '~') {
              response = '/home/guest/raza-devops';
            } else {
              response = '/home/guest/raza-devops/projects';
            }
            break;

          case 'whoami':
            response = 'guest';
            break;

          case 'date':
            response = new Date().toString();
            break;

          case 'uname':
            if (args.includes('-a')) {
              response = 'Linux raza-devops 5.15.0-76-generic #83-Ubuntu SMP Fri Jun 16 19:16:23 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux';
            } else {
              response = 'Linux';
            }
            break;

          case 'echo':
            response = args.join(' ');
            break;

          case 'sudo':
            response = `<span class="warning">guest is not in the sudoers file. This incident will be reported.</span>`;
            break;

          case 'neofetch':
            response = `
<pre style="font-family: inherit; line-height: 1.2; display: flex; gap: 2rem; margin: 0;">
<span style="color: var(--color-primary);">       ./\\
      /  \\      <span style="color: var(--color-secondary);">guest@raza-devops</span>
     /\\   \\     -----------------
    /  \\   \\    OS: Ubuntu 22.04 LTS x86_64
   /    \\   \\   Kernel: 5.15.0-76-generic
  /  /\\  \\   \\  Uptime: 4 years, 3 months
 /  /  \\  \\   \\ Shell: bash 5.1.16
/  /____\\  \\   \\CPU: AMD EPYC (Container node)
/____________\\   \\Memory: 1024MB / 4096MB
                Skills: AWS, K8s, Docker, Terraform</span>
</pre>
            `;
            break;

          case 'ls':
            if (currentDir === '~') {
              response = 'about.txt    skills.txt    resume-pdf.lnk    <span style="color: var(--color-primary); font-weight: bold;">projects/</span>';
            } else if (currentDir === '~/projects') {
              response = 'cloaknote.txt    terraform-vpc.txt';
            }
            break;

          case 'cd':
            const targetDir = args[0] || '~';
            if (targetDir === '~' || targetDir === '/' || targetDir === '/home/guest/raza-devops') {
              currentDir = '~';
              terminalPromptPrefix.innerHTML = `guest@raza-devops:${currentDir}$`;
            } else if (targetDir === '..') {
              if (currentDir === '~/projects') {
                currentDir = '~';
                terminalPromptPrefix.innerHTML = `guest@raza-devops:${currentDir}$`;
              }
            } else if (targetDir === 'projects') {
              if (currentDir === '~') {
                currentDir = '~/projects';
                terminalPromptPrefix.innerHTML = `guest@raza-devops:${currentDir}$`;
              } else {
                response = 'bash: cd: projects: No such file or directory';
              }
            } else {
              response = `bash: cd: ${targetDir}: No such file or directory`;
            }
            break;

          case 'cat':
            const targetFile = args[0];
            if (!targetFile) {
              response = 'cat: missing file argument';
            } else if (currentDir === '~') {
              if (targetFile === 'projects') {
                response = 'cat: projects: Is a directory';
              } else if (files['~'][targetFile]) {
                response = files['~'][targetFile].replace(/\n/g, '<br>');
              } else {
                response = `cat: ${targetFile}: No such file or directory`;
              }
            } else if (currentDir === '~/projects') {
              if (files['~/projects'][targetFile]) {
                response = files['~/projects'][targetFile].replace(/\n/g, '<br>');
              } else {
                response = `cat: ${targetFile}: No such file or directory`;
              }
            }
            break;

          default:
            response = `bash: command not found: ${command}. Type 'help' for options.`;
        }

        if (response) {
          const resultLine = document.createElement('div');
          resultLine.className = 'terminal-line';
          resultLine.innerHTML = response;
          terminalOutput.appendChild(resultLine);
        }
      }

      // Reset input value & scroll to bottom
      terminalInput.value = '';
      terminalWindow.scrollTop = terminalWindow.scrollHeight;
    }
  });


  // --- 7. Scroll Reveal & Staggered Entrance System ---
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  const revealTargets = document.querySelectorAll(
    '.stat-item, .skills-category, .timeline-item, .project-card, .terminal-widget, .contact-card, .section-header, .pipeline-flow'
  );

  revealTargets.forEach(el => {
    el.classList.add('reveal');
    
    // Auto-calculate staggered entrance delays for grid children
    const parent = el.parentElement;
    if (parent) {
      const isGrid = parent.classList.contains('stats-grid') || 
                     parent.classList.contains('skills-grid') || 
                     parent.classList.contains('projects-grid') || 
                     parent.classList.contains('contact-cards-grid');
      if (isGrid) {
        const siblings = Array.from(parent.children);
        const childIndex = siblings.indexOf(el);
        if (childIndex >= 0) {
          el.style.transitionDelay = `${childIndex * 0.12}s`;
        }
      }
    }
    
    revealObserver.observe(el);
  });
});
