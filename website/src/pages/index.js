import React from 'react'
import clsx from 'clsx'
import Layout from '@theme/Layout'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import styles from './index.module.css'
import HomepageFeatures from '../components/HomepageFeatures'
import Translate, { translate } from '@docusaurus/Translate'

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext()
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        {/* <p className="hero__subtitle">{siteConfig.tagline}</p> */}
        <div className="hero__subtitle">
          <div>
            <Translate id="homepage.tagline_1" description="Homepage banner tagline 1">
              An extensible text-to-diagrams library that works in both browser and node.js
            </Translate>
          </div>
          <div>
            <Translate id="homepage.tagline_2" description="Homepage banner tagline 2">
              Expressing your thoughts in a diagram is better than a thousand words. You can create diagrams with intuitive text.
            </Translate>
          </div>
        </div>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/intro">
            <Translate id="homepage.get_started" description="Get started">
              Get Started
            </Translate>
          </Link>
        </div>
      </div>
    </header>
  )
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext()
  return (
    <Layout
      title="Home"
      description={translate({
        message: 'site.description',
        description: 'Site description',
      })}
      keywords={siteConfig.customFields.keywords}
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  )
}
