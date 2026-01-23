import { Input, Button } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useState } from 'react'
import type { SearchBarProps } from '../../types/components'
import styles from './SearchBar.module.scss'

export const SearchBar = ({
  value,
  onSearch,
  placeholder = 'Search assets...',
  loading = false,
}: SearchBarProps) => {
  const [searchValue, setSearchValue] = useState(value)

  const handleSearch = () => onSearch(searchValue)

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className={styles.searchBar}>
      <Input
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder={placeholder}
        prefix={<SearchOutlined />}
        className={styles.input}
        allowClear
      />
      <Button
        type="primary"
        icon={<SearchOutlined />}
        onClick={handleSearch}
        loading={loading}
        className={styles.button}
      >
        Search
      </Button>
    </div>
  )
}

