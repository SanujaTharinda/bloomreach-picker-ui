import { useState, useEffect, useCallback } from 'react'
import { Tree, Spin } from 'antd'
import { FolderOutlined, FolderOpenOutlined } from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import type { Collection, CollectionsTreeProps } from '../../types'
import styles from './CollectionsTree.module.scss'

export const CollectionsTree = ({
  collections,
  selectedCollectionId,
  loading = false,
  onSelectCollection,
  loadCollectionChildren,
}: CollectionsTreeProps) => {
  const [treeData, setTreeData] = useState<DataNode[]>([])
  const [collectionProps, setCollectionProps] = useState<Map<string, { hasResources: boolean; hasChildren: boolean }>>(new Map())

  const toNode = useCallback((c: Collection): DataNode => {
    const isSelectable = c.hasResources || (!c.hasChildren && !c.hasResources)
    return {
      title: c.name,
      key: c.id,
      icon: c.hasChildren ? <FolderOutlined /> : <FolderOpenOutlined />,
      isLeaf: !c.hasChildren,
      selectable: true,
      className: !isSelectable ? 'non-selectable-tree-node' : undefined,
    }
  }, [])

  useEffect(() => {
    if (collections.length > 0) {
      setTreeData(collections.map(toNode))
      setCollectionProps(new Map(collections.map(c => [c.id, { hasResources: c.hasResources, hasChildren: c.hasChildren }])))
    } else {
      setTreeData([])
      setCollectionProps(new Map())
    }
  }, [collections, toNode])

  const handleLoadData = useCallback(async (node: DataNode) => {
    if (node.isLeaf || node.children?.length || !loadCollectionChildren) return

    const children = await loadCollectionChildren(node.key as string)

    setCollectionProps(prev => {
      const map = new Map(prev)
      children.forEach(c => map.set(c.id, { hasResources: c.hasResources, hasChildren: c.hasChildren }))
      return map
    })

    setTreeData(prev => {
      const update = (nodes: DataNode[]): DataNode[] =>
        nodes.map(n =>
          n.key === node.key
            ? { ...n, children: children.map(toNode) }
            : n.children
            ? { ...n, children: update(n.children) }
            : n
        )
      return update(prev)
    })
  }, [loadCollectionChildren, toNode])

  const handleSelect = useCallback((keys: React.Key[]) => {
    if (keys.length === 0) return

    const id = keys[0] as string
    const props = collectionProps.get(id)
    const { hasResources = false, hasChildren = false } = props || {}

    if (hasResources || (!hasChildren && !hasResources)) {
      onSelectCollection(id)
    }
  }, [collectionProps, onSelectCollection])

  if (loading) return <div className={styles.loading}><Spin size="large" /></div>

  return (
    <Tree
      showIcon
      selectedKeys={selectedCollectionId ? [selectedCollectionId] : []}
      treeData={treeData}
      loadData={loadCollectionChildren ? handleLoadData : undefined}
      onSelect={handleSelect}
      className={styles.collectionsTree}
    />
  )
}
