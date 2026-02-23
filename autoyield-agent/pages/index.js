import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import styles from '../styles/Landing.module.css';
import roadmapStyles from '../styles/Roadmap.module.css';

export default function Home() {
    const cardsRef = useRef([]);

    useEffect(() => {
        // Mouse hover effect for feature cards
        const handleMouseMove = (e) => {
            for (const card of cardsRef.current) {
                if (!card) continue;
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className={styles.container}>
            <Head>
                <title>AutoYield Agent | Professional DeFi Farming</title>
                <meta name="description" content="AI-driven multi-protocol yield farming agent" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            {/* Animated Background */}
            <div className={styles.background}>
                <div className={styles.orb1}></div>
                <div className={styles.orb2}></div>
                <div className={styles.orb3}></div>
            </div>

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.logoArea}>
                    <div className={styles.logoIcon}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 22h20L12 2z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                            <path d="M12 10l-4 8h8l-4-8z" fill="white" />
                        </svg>
                    </div>
                    AutoYield
                </div>
                <nav className={styles.nav}>
                    <Link href="#features" className={styles.navLink}>Features</Link>
                    <Link href="#how-it-works" className={styles.navLink}>How it Works</Link>
                    <Link href="#roadmap" className={styles.navLink}>Roadmap</Link>
                    <a href="#" className={styles.navLink}>Docs</a>
                </nav>
                <Link href="/dapp">
                    <button className={styles.appButton}>Launch App</button>
                </Link>
            </header>

            {/* Hero Section */}
            <main className={styles.hero}>
                <div className={styles.badge}>
                    <div className={styles.pulseDot}></div>
                    Sepolia Testnet Active
                </div>

                <h1 className={styles.title}>
                    Intelligence meets <span>Yield Farming</span>
                </h1>

                <p className={styles.description}>
                    The first autonomous AI agent that constantly monitors and
                    optimizes your DeFi yields across multiple protocols, maximizing
                    your returns with minimal risk and zero effort.
                </p>

                <div className={styles.heroButtons}>
                    <Link href="/dapp">
                        <button className={`${styles.appButton} ${styles.largeAppButton}`}>
                            Start Earning Now
                        </button>
                    </Link>
                    <a href="#how-it-works">
                        <button className={styles.secondaryBtn}>Learn More</button>
                    </a>
                </div>
            </main>

            {/* Stats Bar */}
            <div className={styles.statsContainer}>
                <div className={styles.statItem}>
                    <div className={styles.statValue}>$15M+</div>
                    <div className={styles.statLabel}>Total Volume Managed</div>
                </div>
                <div className={styles.statItem}>
                    <div className={styles.statValue}>4.2%</div>
                    <div className={styles.statLabel}>Avg Yield Boost</div>
                </div>
                <div className={styles.statItem}>
                    <div className={styles.statValue}>24/7</div>
                    <div className={styles.statLabel}>Market Monitoring</div>
                </div>
            </div>

            {/* Features Section */}
            <section id="features" className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Why AutoYield Agent?</h2>
                    <p className={styles.sectionDescription}>Our AI agent works tirelessly to ensure your capital is always deployed in the most efficient and secure manner across DeFi.</p>
                </div>

                <div className={styles.featuresGrid}>
                    <div className={styles.featureCard} ref={el => cardsRef.current[0] = el}>
                        <div className={styles.featureIcon}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="28" height="28"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                        <h3>Smart Routing</h3>
                        <p>Continuously evaluates AAVE, Compound, and other lending protocols to instantly identify the highest APY opportunities.</p>
                    </div>

                    <div className={styles.featureCard} ref={el => cardsRef.current[1] = el}>
                        <div className={styles.featureIcon}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="28" height="28"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                        </div>
                        <h3>Risk Management</h3>
                        <p>Employs dynamic Confidence Thresholds and Persistence Checks to prevent unprofitable ping-ponging between protocols.</p>
                    </div>

                    <div className={styles.featureCard} ref={el => cardsRef.current[2] = el}>
                        <div className={styles.featureIcon}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="28" height="28"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </div>
                        <h3>Auto-Execution</h3>
                        <p>Set it and forget it. The agent automatically executes complex multi-step smart contract calls when optimal conditions are met.</p>
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section id="how-it-works" className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>How It Works</h2>
                    <p className={styles.sectionDescription}>Three simple steps to put your crypto to work intelligently.</p>
                </div>

                <div className={styles.processSteps}>
                    <div className={styles.step}>
                        <div className={styles.stepNumber}>1</div>
                        <h4>Fund Agent Wallet</h4>
                        <p>Deposit USDC into your secure AutoYield smart wallet.</p>
                    </div>
                    <div className={styles.step}>
                        <div className={styles.stepNumber}>2</div>
                        <h4>Set Preferences</h4>
                        <p>Define your min delta, gas limits, and execution modes.</p>
                    </div>
                    <div className={styles.step}>
                        <div className={styles.stepNumber}>3</div>
                        <h4>AI Takes Over</h4>
                        <p>The agent monitors and moves funds to maximize your yield.</p>
                    </div>
                </div>
            </section>

            {/* Roadmap Section */}
            <section id="roadmap" className={roadmapStyles.roadmapSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Product Roadmap</h2>
                    <p className={styles.sectionDescription}>Our vision for the future of fully autonomous, cross-chain yield optimization.</p>
                </div>

                <div className={roadmapStyles.timeline}>

                    <div className={`${roadmapStyles.timelineItem} ${roadmapStyles.active}`}>
                        <div className={roadmapStyles.timelineDot}></div>
                        <div className={roadmapStyles.timelineContent}>
                            <div className={roadmapStyles.phaseTitle}>
                                <span className={roadmapStyles.phaseBadge}>Phase 1</span>
                                <h3>MVP & Core Logic</h3>
                            </div>
                            <p>Launch on Sepolia Testnet. Initial integration with AAVE and Compound. Basic AI decision engine with Momentum and EMA analysis. Native Telegram bot alerts.</p>
                        </div>
                    </div>

                    <div className={roadmapStyles.timelineItem}>
                        <div className={roadmapStyles.timelineDot}></div>
                        <div className={roadmapStyles.timelineContent}>
                            <div className={roadmapStyles.phaseTitle}>
                                <span className={roadmapStyles.phaseBadge}>Phase 2</span>
                                <h3>Multi-chain Expansion</h3>
                            </div>
                            <p>Mainnet deployment on Arbitrum and Optimism for low-gas execution. Addition of 5+ new lending protocols (Radiant, Morpho, etc.). Gas-aware routing algorithms.</p>
                        </div>
                    </div>

                    <div className={roadmapStyles.timelineItem}>
                        <div className={roadmapStyles.timelineDot}></div>
                        <div className={roadmapStyles.timelineContent}>
                            <div className={roadmapStyles.phaseTitle}>
                                <span className={roadmapStyles.phaseBadge}>Phase 3</span>
                                <h3>Advanced AI & LPs</h3>
                            </div>
                            <p>Integration of Machine Learning models for predictive APY forecasting. Expansion from simple lending to Liquidity Provisioning (Uniswap V3) and leveraged yields.</p>
                        </div>
                    </div>

                    <div className={roadmapStyles.timelineItem}>
                        <div className={roadmapStyles.timelineDot}></div>
                        <div className={roadmapStyles.timelineContent}>
                            <div className={roadmapStyles.phaseTitle}>
                                <span className={roadmapStyles.phaseBadge}>Phase 4</span>
                                <h3>Decentralized Governance</h3>
                            </div>
                            <p>Launch of the $AYD token. Transition of protocol control and AI parameter tuning to the DAO. Fully decentralized, trustless agent network.</p>
                        </div>
                    </div>

                </div>
            </section>

            {/* CTA Section */}
            <section className={styles.ctaSection}>
                <h2 className={styles.ctaTitle}>Ready to automate your yields?</h2>
                <Link href="/dapp">
                    <button className={`${styles.appButton} ${styles.largeAppButton}`}>
                        Launch Dapp Now
                    </button>
                </Link>
            </section >

            {/* Footer */}
            < footer className={styles.footer} >
                <div className={styles.footerTop}>
                    <div className={styles.footerBrand}>
                        <div className={styles.logoArea}>
                            <div className={styles.logoIcon} style={{ width: 24, height: 24, borderRadius: 6 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2L2 22h20L12 2z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                                </svg>
                            </div>
                            AutoYield
                        </div>
                        <p className={styles.description}>
                            Building the future of autonomous decentralized finance.
                        </p>
                    </div>
                    <div className={styles.footerLinks}>
                        <div className={styles.linkColumn}>
                            <h5>Product</h5>
                            <Link href="/dapp">Launch App</Link>
                            <a href="#features">Features</a>
                            <a href="#how-it-works">How it works</a>
                            <a href="#roadmap">Roadmap</a>
                        </div>
                        <div className={styles.linkColumn}>
                            <h5>Resources</h5>
                            <a href="#">Documentation</a>
                            <a href="#">Security Audit</a>
                            <a href="#">GitHub</a>
                        </div>
                        <div className={styles.linkColumn}>
                            <h5>Community</h5>
                            <a href="#">Twitter</a>
                            <a href="#">Discord</a>
                            <a href="#">Blog</a>
                        </div>
                    </div>
                </div>
                <div className={styles.footerBottom}>
                    <div>&copy; 2026 AutoYield Agent. All rights reserved.</div>
                    <div>Terms of Service &middot; Privacy Policy</div>
                </div>
            </footer >
        </div >
    );
}
